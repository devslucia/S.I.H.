import NextAuth from "next-auth";

export const { auth } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
