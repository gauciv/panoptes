import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Mail, Type } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    // 1. Get a unique identifier for the current user (Username or Email)
    // We prefer username as it's immutable, but email works too.
    const userId = user?.username || user?.signInDetails?.loginId || 'guest';
    const email = user?.signInDetails?.loginId || 'user@example.com';

    // 2. Load saved name SPECIFIC to this user ID
    useEffect(() => {
        if (userId === 'guest') return;

        const savedFirst = localStorage.getItem(`panoptes_user_${userId}_first_name`);
        const savedLast = localStorage.getItem(`panoptes_user_${userId}_last_name`);

        // Reset state first (in case switching users without full refresh)
        setFirstName(savedFirst || '');
        setLastName(savedLast || '');
    }, [userId]);

    // 3. Save locally with the USER ID in the key
    const handleSaveName = () => {
        if (userId === 'guest') return;

        localStorage.setItem(`panoptes_user_${userId}_first_name`, firstName);
        localStorage.setItem(`panoptes_user_${userId}_last_name`, lastName);

        // Trigger event so SideNav updates immediately
        window.dispatchEvent(new Event('user_profile_updated'));

        toast.success("Profile saved locally");
    };

    const handleSignOutConfirm = async () => {
        try {
            await logout();
            navigate('/');
            toast.success("Signed out successfully");
        } catch (error) {
            console.error("Logout failed", error);
            toast.error("Logout failed");
        }
    };

    const greetingName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : "Operator";

    return (
        <div className="max-w-2xl mx-auto p-6 pt-10">

            <div className="bg-card shadow-sm rounded-lg overflow-hidden border border-border">

                {/* Header Greeting */}
                <div className="p-8 bg-gradient-to-b from-transparent to-accent/10 border-b border-border flex flex-col items-center">
                    <div className="w-24 h-24 bg-sentinel/10 rounded-full flex items-center justify-center text-sentinel border-2 border-sentinel/20 shadow-sm mb-4">
                        <User className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Hello, {greetingName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your profile details</p>
                </div>

                {/* Profile Details Form */}
                <div className="p-8 space-y-6 bg-card">
                    <div className="grid gap-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-muted-foreground" /> First Name
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    onBlur={handleSaveName}
                                    className="w-full px-4 py-2 bg-background border border-input rounded-tech focus:ring-2 focus:ring-sentinel/50 focus:border-sentinel text-foreground text-sm"
                                    placeholder="Enter first name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                                    <Type className="w-4 h-4 text-muted-foreground" /> Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    onBlur={handleSaveName}
                                    className="w-full px-4 py-2 bg-background border border-input rounded-tech focus:ring-2 focus:ring-sentinel/50 focus:border-sentinel text-foreground text-sm"
                                    placeholder="Enter last name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                            </label>
                            <div className="w-full px-4 py-2 bg-muted/50 border border-border rounded-tech text-muted-foreground cursor-not-allowed font-mono text-sm">
                                {email}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-1">Email cannot be changed.</p>
                        </div>

                    </div>
                </div>

                <div className="bg-muted/30 p-8 border-t border-border">
                    <button
                        onClick={() => setShowSignOutConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-card hover:bg-red-50 dark:hover:bg-red-900/10 rounded-tech transition-all shadow-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

            </div>

            {showSignOutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-lg shadow-xl max-w-sm w-full p-6 border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Sign Out</h3>
                        <p className="text-muted-foreground mb-6">
                            Are you sure you want to log out?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSignOutConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-tech transition-colors"
                            >
                                No
                            </button>
                            <button
                                onClick={handleSignOutConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-tech transition-colors shadow-sm"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Profile;