import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { getEnvOrNull } from "@/lib/config/env";
import { isRushifyAuthConfigured } from "@/lib/auth/rushify-users";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const env = getEnvOrNull();
  const canSignIn =
    (env ? isRushifyAuthConfigured(env) : false) || Boolean(env?.JELLYFIN_SERVER_URL);

  return (
    <Suspense>
      <LoginForm canSignIn={canSignIn} />
    </Suspense>
  );
}
