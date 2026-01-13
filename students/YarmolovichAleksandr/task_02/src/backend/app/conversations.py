from flask_restx import Namespace, Resource, fields
from flask import request
from .models import Conversation, Message, Ad, User
from .extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity

ns = Namespace('conversations', description='Conversations and messages')

create_conv_model = ns.model('CreateConversation', {
    'adId': fields.String(required=True),
    'partnerId': fields.String(required=True)
})

msg_model = ns.model('Message', {
    'text': fields.String(required=True)
})


@ns.route('')
class ConversationList(Resource):
    @jwt_required()
    def get(self):
        user_id = get_jwt_identity()
        convs = Conversation.query.filter((Conversation.user1_id==user_id)|(Conversation.user2_id==user_id)).all()
        data = []
        for c in convs:
            partner_id = c.user1_id if c.user2_id == user_id else c.user2_id
            partner = User.query.get(partner_id)
            ad = Ad.query.get(c.ad_id)
            data.append({'id': c.id, 'ad_id': c.ad_id, 'ad_title': getattr(ad, 'title', None), 'partner_id': partner_id, 'partner_username': getattr(partner, 'username', None)})
        return {'status':'ok','data':data}

    @ns.expect(create_conv_model)
    @jwt_required()
    def post(self):
        data = request.json
        user_id = get_jwt_identity()
        ad = Ad.query.get_or_404(data['adId'])
        partner = data['partnerId']
        if partner == user_id:
            return {'status':'error','error':{'code':'validation_failed','message':'Cannot create conversation with self'}},400
        # ensure conversation doesn't exist
        c = Conversation.query.filter_by(ad_id=ad.id).filter(
            ((Conversation.user1_id==user_id)&(Conversation.user2_id==partner))|((Conversation.user1_id==partner)&(Conversation.user2_id==user_id))
        ).first()
        if c:
            return {'status':'ok','data':{'id':c.id}},200
        conv = Conversation(ad_id=ad.id, user1_id=user_id, user2_id=partner)
        db.session.add(conv)
        db.session.commit()
        return {'status':'ok','data':{'id':conv.id}},201


@ns.route('/<string:id>')
class ConversationItem(Resource):
    @jwt_required()
    def get(self,id):
        user_id = get_jwt_identity()
        conv = Conversation.query.get_or_404(id)
        if user_id not in (conv.user1_id, conv.user2_id):
            return {'status':'error','error':{'code':'forbidden','message':'Not a participant'}},403
        user1 = User.query.get(conv.user1_id)
        user2 = User.query.get(conv.user2_id)
        return {'status':'ok','data':{'id':conv.id,'ad_id':conv.ad_id,'user1_id':conv.user1_id,'user1_username':getattr(user1,'username',None),'user2_id':conv.user2_id,'user2_username':getattr(user2,'username',None)}}


@ns.route('/<string:id>/messages')
class ConversationMessages(Resource):
    @jwt_required()
    def get(self,id):
        user_id = get_jwt_identity()
        conv = Conversation.query.get_or_404(id)
        if user_id not in (conv.user1_id, conv.user2_id):
            return {'status':'error','error':{'code':'forbidden','message':'Not a participant'}},403
        msgs = Message.query.filter_by(conversation_id=id).order_by(Message.created_at.asc()).all()
        data = []
        for m in msgs:
            author = User.query.get(m.author_id)
            data.append({'id': m.id, 'text': m.text, 'author_id': m.author_id, 'author_username': getattr(author, 'username', None), 'created_at': m.created_at.isoformat()})
        return {'status':'ok','data':data}

    @ns.expect(msg_model)
    @jwt_required()
    def post(self, id):
        user_id = get_jwt_identity()
        conv = Conversation.query.get_or_404(id)
        if user_id not in (conv.user1_id, conv.user2_id):
            return {'status':'error','error':{'code':'forbidden','message':'Not a participant'}},403
        data = request.json
        if not data.get('text'):
            return {'status':'error','error':{'code':'validation_failed','message':'Message text required'}},400
        msg = Message(conversation_id=id, author_id=user_id, text=data['text'])
        db.session.add(msg)
        db.session.commit()
        return {'status':'ok','data':{'id':msg.id,'text':msg.text,'created_at':msg.created_at.isoformat()}},201