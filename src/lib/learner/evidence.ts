/**
 * Checks that submitted evidence belongs to the learner.
 *
 * This proves the URL sits under the handle they declared — it does not prove
 * they own that handle. Reviewers confirm ownership at the first assessment by
 * checking the commit history against the work; GitHub sign-in would make it
 * automatic if we ever need it.
 */

export function normaliseGithubUsername(input: string): string | null {
  // Accepts any of: octocat · @octocat · github.com/octocat · https://github.com/octocat/repo
  const value = input.trim().replace(/^@/, "").replace(/\/+$/, "");
  const fromUrl = value.match(/(?:^|\/\/)(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/i)?.[1];
  const handle = (fromUrl ?? value.split(/[/?#]/)[0]).trim();
  return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(handle) ? handle : null;
}

export function normaliseLinkedinSlug(input: string): string | null {
  // Accepts any of: yourname · linkedin.com/in/yourname · https://www.linkedin.com/in/yourname/?originalSubdomain=in
  const value = input.trim().replace(/\/+$/, "");
  const fromUrl = value.match(/(?:^|\/\/)(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9\u00C0-\u024F-]{3,100})/i)?.[1];
  const slug = (fromUrl ?? value.replace(/^@/, "").split(/[/?#]/)[0]).trim();
  return /^[A-Za-z0-9\u00C0-\u024F-]{3,100}$/.test(slug) ? slug.toLowerCase() : null;
}

/** The deliverable must live under the learner's own GitHub account. */
export function checkGithubUrl(url: string, username: string | null): string | null {
  if (!/^https?:\/\/(www\.)?github\.com\//i.test(url)) return null; // not a GitHub link; other hosts are allowed
  if (!username) return "Add your GitHub username to your profile first, so we can check this link is yours.";
  const owner = url.match(/github\.com\/([A-Za-z0-9-]{1,39})/i)?.[1];
  return owner?.toLowerCase() === username.toLowerCase()
    ? null
    : `That repository belongs to “${owner}”, not your account (${username}). Submit a link from your own GitHub.`;
}

/** A LinkedIn post URL carries its author's slug, so it can be checked the same way. */
export function checkLinkedinPostUrl(url: string, slug: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update)\//i.test(url)) {
    return "That is not a LinkedIn post link. Open your post, use Copy link to post, and paste that.";
  }
  if (!slug) return "Add your LinkedIn profile to your profile page first, so we can check the post is yours.";
  const author = url.match(/linkedin\.com\/posts\/([A-Za-z0-9-]{3,100})_/i)?.[1];
  if (!author) return null; // feed/update links carry no author segment; a reviewer checks those
  return author.toLowerCase() === slug.toLowerCase()
    ? null
    : `That post was written by “${author}”, not you (${slug}). Post it from your own profile and paste that link.`;
}

/** Weekly build-in-public posts are due after each assessment. */
export const LINKEDIN_POST_DAYS = [7, 14, 21, 28];
