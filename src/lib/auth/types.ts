export type AuthRole = "PARENT" | "CHILD";

/** Everything a data-access function needs to scope a query. Never built from client input. */
export interface AuthContext {
  userId: string;
  role: AuthRole;
  familyId: string;
  displayName: string;
  timezone: string;
  /** Present when role === "CHILD". */
  childId?: string;
  /** Present when role === "PARENT". */
  parentId?: string;
  sessionId: string;
}

export interface ParentContext extends AuthContext {
  role: "PARENT";
  parentId: string;
}

export interface ChildContext extends AuthContext {
  role: "CHILD";
  childId: string;
}
