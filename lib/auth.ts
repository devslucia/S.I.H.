import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.usuario.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.password) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!passwordMatch) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.nombre,
            rol: user.rol,
            matricula: user.matricula ?? null,
            apellido: user.apellido ?? null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const extra = user as unknown as {
          rol: string;
          matricula?: string | null;
          apellido?: string | null;
        };
        token.id = user.id;
        token.rol = extra.rol ?? "";
        token.matricula = extra.matricula ?? null;
        token.apellido = extra.apellido ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as string;
        session.user = {
          ...session.user,
          matricula: (token.matricula as string | null) ?? "",
          apellido: (token.apellido as string | null) ?? "",
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
