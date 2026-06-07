import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const { user, isLoggedIn } = useAuth();

  return (
    <div className="max-w-5xl mx-auto p-4 pt-0">
      <div className="border rounded-lg bg-card shadow p-6">
        <p className="text-sm text-muted-foreground mb-1">Status</p>
        <p className="text-lg mb-4">
          {isLoggedIn ? "Logged in" : "Logged out"}
        </p>
        {user?.email && (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Email</p>
            <p className="text-lg">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
