import packageJson from "../../package.json" with { type: "json" };

/** Where MetaBrainz can reach the maintainers if Tunearr misbehaves. */
export const TUNEARR_CONTACT_URL = "https://github.com/BlieNuckel/tunearr";

/**
 * The identity MetaBrainz sees for every install. The `v` before the version is
 * the form their gateway matches. Don't change it, or send another name to get
 * past a refusal, without asking MetaBrainz first.
 */
export function buildUserAgent(version: string): string {
  return `Tunearr/v${version} (${TUNEARR_CONTACT_URL})`;
}

/** Sent to every MetaBrainz service (MusicBrainz and ListenBrainz). Follows `package.json`'s version. */
export const TUNEARR_USER_AGENT = buildUserAgent(packageJson.version);
