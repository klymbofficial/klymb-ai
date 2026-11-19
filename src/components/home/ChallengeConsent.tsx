/**
 * The line by the button that starts a challenge. A challenge has no
 * registration form, so there is no agreement box: pressing the button is the
 * agreement, and this is what it says. It sits wherever a challenge is started
 * (under "Continue with Google", and on the screen a signed-in person lands on).
 */
export function ChallengeConsent({ className }: { className?: string }) {
  return (
    <p className={className}>
      By continuing you agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Privacy Policy</a> and to
      hear from us about the challenge by email.
    </p>
  );
}
