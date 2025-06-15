import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, logout } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User as UserIcon, Github } from "lucide-react";

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

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-chat flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-chat flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
            <div className="text-center mb-8">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-textPrimary bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                IntelliChat AI
              </h1>
              <p className="text-gray-600">Masuk untuk melanjutkan percakapan dengan AI</p>
            </div>

            <Button
              onClick={handleSignIn}
              className="w-full gradient-primary text-white py-3 rounded-2xl font-medium hover:shadow-lg transition-all duration-200"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Masuk dengan Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 mb-3">Juga tersedia di:</p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="px-4 py-2 rounded-full border-gray-200 hover:bg-gray-50"
                  onClick={() => window.open("https://github.com", "_blank")}
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {children(user)}
      
      {/* User Menu */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-white/30">
          <img
            src={user.photoURL || ""}
            alt={user.displayName || "User"}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user.displayName?.split(" ")[0]}
          </span>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="p-1.5 rounded-full hover:bg-red-50 text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}