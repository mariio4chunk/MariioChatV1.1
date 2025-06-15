
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Bot, Chrome, LogIn } from "lucide-react";

interface AuthWrapperProps {
  children: (user: User | null) => React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For development, check if we have a demo user in localStorage
    if (process.env.NODE_ENV === 'development') {
      const demoUser = localStorage.getItem('demoUser');
      if (demoUser) {
        setUser(JSON.parse(demoUser) as User);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (!result) {
        return;
      }
      
      // For development, store in localStorage
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem('demoUser', JSON.stringify(result));
        setUser(result as User);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <div className="w-24 h-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mx-auto animate-pulse"></div>
            <p className="text-gray-600 font-medium">Loading Mario AI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white text-3xl font-bold">M</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                Welcome to Mario AI
              </h1>
              <p className="text-gray-600 text-lg">Masuk untuk memulai percakapan AI</p>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-medium flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <LogIn className="w-6 h-6" />
              <span className="text-lg">Masuk dengan Google</span>
            </Button>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">Autentikasi aman dengan Google</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}
