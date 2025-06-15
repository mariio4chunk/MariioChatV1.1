import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Bot, Chrome } from "lucide-react";

interface AuthWrapperProps {
  children: (user: User | null) => React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl font-bold">M</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Mario AI</h1>
            <p className="text-gray-600">Sign in to start chatting</p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
          >
            <Chrome className="w-5 h-5" />
            <span>Continue with Google</span>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}