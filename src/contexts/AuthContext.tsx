import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: 'doctor' | 'patient';
  name: string;
  assignedDoctor?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users data (in real app this would come from users.json)
const mockUsers: User[] = [
  { id: '1', username: 'dr.smith', role: 'doctor', name: 'Dr. Sarah Smith' },
  { id: '2', username: 'dr.jones', role: 'doctor', name: 'Dr. Michael Jones' },
  { id: '3', username: 'patient1', role: 'patient', name: 'John Doe', assignedDoctor: '1' },
  { id: '4', username: 'patient2', role: 'patient', name: 'Jane Wilson', assignedDoctor: '1' },
  { id: '5', username: 'patient3', role: 'patient', name: 'Robert Chen', assignedDoctor: '2' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (localStorage simulation)
    const savedUser = localStorage.getItem('docplus_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Mock authentication - in real app this would call /login endpoint
    const foundUser = mockUsers.find(u => u.username === username);
    
    if (foundUser && password === 'password123') {
      setUser(foundUser);
      localStorage.setItem('docplus_user', JSON.stringify(foundUser));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('docplus_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};