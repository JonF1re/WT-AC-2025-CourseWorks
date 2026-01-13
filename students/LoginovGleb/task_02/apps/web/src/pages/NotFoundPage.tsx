import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody } from '../components';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="page-not-found">
      <Card>
        <CardBody>
          <div className="not-found-content">
            <h1 className="not-found-code">404</h1>
            <h2 className="not-found-title">Страница не найдена</h2>
            <p className="not-found-description">
              Запрашиваемая страница не существует или была удалена.
            </p>
            <Link to="/">
              <Button variant="primary">
                Вернуться на главную
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
