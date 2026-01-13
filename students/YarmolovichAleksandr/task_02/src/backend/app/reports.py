from flask_restx import Namespace, Resource, fields
from flask import request
from .models import Report, Ad
from .extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from .utils import role_required

ns = Namespace('reports', description='Reports and moderation')

report_model = ns.model('Report', {
    'adId': fields.String(required=True),
    'reason': fields.String(required=True)
})

status_model = ns.model('ReportStatus', {
    'status': fields.String(required=True)
})


@ns.route('')
class ReportList(Resource):
    @jwt_required()
    def post(self):
        data = request.json
        user_id = get_jwt_identity()
        if not data.get('adId') or not data.get('reason'):
            return {'status':'error','error':{'code':'validation_failed','message':'adId and reason required'}},400
        r = Report(ad_id=data['adId'], reporter_id=user_id, reason=data['reason'])
        db.session.add(r)
        db.session.commit()
        return {'status':'ok','data':{'id':r.id}},201

    @jwt_required()
    @role_required(['admin','moderator'])
    def get(self):
        status = request.args.get('status')
        q = Report.query
        if status:
            q = q.filter_by(status=status)
        else:
            q = q.filter(Report.status != 'resolved')
        items = q.all()
        data = []
        for r in items:
            ad = Ad.query.get(r.ad_id)
            ad_title = ad.title if ad else None
            reporter_username = None
            try:
                from .models import User
                reporter = User.query.get(r.reporter_id)
                reporter_username = reporter.username if reporter else r.reporter_id
            except Exception:
                reporter_username = r.reporter_id
            data.append({'id': r.id, 'ad_id': r.ad_id, 'ad_title': ad_title, 'reason': r.reason, 'reporter_id': r.reporter_id, 'reporter_username': reporter_username, 'status': r.status})
        return {'status':'ok','data':data}


@ns.route('/<string:id>')
class ReportItem(Resource):
    @jwt_required()
    @role_required(['admin','moderator'])
    def get(self,id):
        r = Report.query.get_or_404(id)
        ad = Ad.query.get(r.ad_id)
        ad_title = ad.title if ad else None
        reporter_username = None
        try:
            from .models import User
            reporter = User.query.get(r.reporter_id)
            reporter_username = reporter.username if reporter else r.reporter_id
        except Exception:
            reporter_username = r.reporter_id
        return {'status':'ok','data':{'id':r.id,'ad_id':r.ad_id,'ad_title':ad_title,'reason':r.reason,'reporter_id':r.reporter_id,'reporter_username':reporter_username,'status':r.status}}
    @ns.expect(status_model)
    @jwt_required()
    @role_required(['admin','moderator'])
    def put(self,id):
        r = Report.query.get_or_404(id)
        data = request.json
        new_status = data.get('status')
        if new_status not in ('new','reviewing','resolved'):
            return {'status':'error','error':{'code':'validation_failed','message':'Invalid status'}},400
        r.status = new_status
        db.session.commit()
        # if moderator sets resolved and wants to block ad (example: status=resolved + block param)
        if data.get('block_ad'):
            ad = Ad.query.get(r.ad_id)
            if ad:
                ad.status = 'banned'
                db.session.commit()
        return {'status':'ok','data':{'id':r.id,'status':r.status}}