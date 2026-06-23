import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="section flex flex-col items-center py-128 text-center">
      <p className="text-display font-display font-w360 text-mercury-blue">404</p>
      <h1 className="mt-16 text-heading font-display font-w360 text-starlight">Page not found</h1>
      <Link to="/" className="btn-primary mt-32">
        Back home
      </Link>
    </div>
  );
}
