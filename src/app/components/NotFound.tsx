import { Link } from 'react-router';
import { Button } from './ui/button';
import { Home, BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-primary/20 mb-4 select-none">404</div>
        <h1 className="text-3xl font-black text-white mb-3">Page not found</h1>
        <p className="text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold">
              <Home className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </Link>
          <Link to="/quizzes">
            <Button variant="outline" className="border-zinc-700 hover:bg-white/5 text-zinc-300">
              <BookOpen className="w-4 h-4 mr-2" /> Browse Quizzes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
