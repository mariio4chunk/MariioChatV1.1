
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Bot, LogIn, Loader2 } from "lucide-react";

interface AuthWrapperProps {
  children: (user: User | null) => React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    
    try {
      setSigningIn(true);
      const result = await signInWithGoogle();
      if (result) {
        setUser(result);
      }
    } catch (error) {
      console.error("Google sign in error:", error);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
            <p className="text-slate-600 font-medium text-lg">Memuat Mario AI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <span className="text-white text-4xl font-bold">M</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
                Selamat Datang di Mario AI
              </h1>
              <p className="text-slate-600 text-lg">Masuk dengan akun Google untuk memulai</p>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white py-4 rounded-xl font-medium flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-lg">Sedang masuk...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  <span className="text-lg">Masuk dengan Google</span>
                </>
              )}
            </Button>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Autentikasi aman menggunakan Firebase & Google
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}
