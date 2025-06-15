import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, logout } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, User as UserIcon, Crown, Sparkles } from "lucide-react";
import { FloatingParticles } from "@/components/GimmickFeatures";

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
      console.error("Google sign in error:", error);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center relative overflow-hidden">
        <FloatingParticles />
        
        {/* Background Decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-transparent to-pink-100/20" />
        
        <div className="max-w-md w-full mx-4 z-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/50 transform transition-all duration-500 hover:scale-105">
            <div className="text-center mb-10">
              <div className="relative mb-6">
                <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 bg-clip-text text-transparent mb-3">
                Mario AI
              </h1>
              <p className="text-gray-600 text-lg mb-2">Asisten AI Cerdas</p>
              <p className="text-gray-500 text-sm">Powered by Google Gemini</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleSignIn}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-4 rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                <LogIn className="w-5 h-5 mr-3" />
                Masuk dengan Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">atau</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Fitur Mario AI:</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <Sparkles className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <span className="text-purple-700 font-medium">AI Cerdas</span>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                    <Crown className="w-4 h-4 text-pink-600 mx-auto mb-1" />
                    <span className="text-pink-700 font-medium">Premium</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">
                Dengan masuk, Anda menyetujui penggunaan layanan kami
              </p>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-md">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">Mario AI siap membantu</span>
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