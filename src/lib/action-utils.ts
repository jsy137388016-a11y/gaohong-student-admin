export function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest || "") : "";
  const message = error instanceof Error ? error.message : "";
  return message === "NEXT_REDIRECT" || digest.startsWith("NEXT_REDIRECT");
}

export function actionErrorMessage(error: unknown, fallback = "未知错误") {
  return error instanceof Error ? error.message : fallback;
}

export function actionUrl(path: string, params: { notice?: string; error?: string } = {}) {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
