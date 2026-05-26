import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('=== AUTHORIZE CALLED ===');
        console.log('Email recibido:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log('ERROR: credentials vacías');
          return null;
        }

        const user = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
        });

        console.log('Usuario encontrado:', user ? user.email : 'NO ENCONTRADO');
        console.log('Password en DB:', user?.password?.substring(0, 10) + '...');

        if (!user || !user.password) {
          console.log('ERROR: usuario no encontrado');
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        console.log('Password match:', passwordMatch);

        if (!passwordMatch) {
          console.log('ERROR: password incorrecta');
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: user.rol,
          matricula: user.matricula ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = (user as any).rol;
        token.matricula = (user as any).matricula;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).rol = token.rol;
        (session.user as any).matricula = token.matricula;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
