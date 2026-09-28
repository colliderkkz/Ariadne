"use client";

import "./idea-project.css";
import "./tag-library.css";
import "./idea-edit.css";
import "./project-overview.css";
import "./profile.css";
import "./records.css";
import "./enhancements.css";
import "./vertical-flow.css";
import "./connection.css";
import "./settings.css";
import { AuthGate } from "@/features/auth/AuthGate";
import { Workspace } from "@/features/workspace/Workspace";

export default function Home() {
  return (
    <AuthGate>
      {(user, logout, updateUser) => (
        <Workspace
          key={user.id}
          user={user}
          logout={logout}
          onUpdateUser={updateUser}
        />
      )}
    </AuthGate>
  );
}
