import { memo, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/stores/useAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onClose();
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div className="relative w-full max-w-md bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {mode === "login" ? "LOGIN" : "REGISTER"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-indigo-800 bg-opacity-50 text-white placeholder-gray-400 border border-indigo-600 focus:border-indigo-400 focus:outline-none"
                placeholder="Enter username"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-indigo-800 bg-opacity-50 text-white placeholder-gray-400 border border-indigo-600 focus:border-indigo-400 focus:outline-none"
                placeholder="Enter password"
                required
                minLength={6}
              />
            </div>
            
            {error && (
              <div className="bg-red-600 bg-opacity-50 border border-red-500 text-white px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : mode === "login" ? "LOGIN" : "REGISTER"}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-indigo-300 hover:text-indigo-200 text-sm transition-colors"
            >
              {mode === "login" 
                ? "Don't have an account? Register" 
                : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(AuthModal);
