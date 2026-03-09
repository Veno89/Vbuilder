export type User = {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  isSuspended: boolean;
};

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(userId: string): Promise<User | null>;
  create(input: { email: string; passwordHash: string }): Promise<User>;
  markEmailVerified(userId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
