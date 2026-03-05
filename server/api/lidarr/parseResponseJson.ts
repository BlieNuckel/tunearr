/**
 * Safely parses a response as JSON. When Lidarr returns a non-JSON response
 * (e.g. an HTML page due to wrong URL or auth redirect), throws a clear error
 * instead of a cryptic JSON parse failure.
 */
export async function parseResponseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const body = await response.text();
    const preview = body.length > 200 ? body.slice(0, 200) + "…" : body;
    throw new Error(
      `Lidarr returned non-JSON response (${response.status} ${contentType || "no content-type"}): ${preview}`,
    );
  }

  return response.json();
}
