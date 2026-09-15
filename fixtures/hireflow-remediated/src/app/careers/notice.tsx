/**
 * Candidate notice.
 *
 * NYC Local Law 144, 6 RCNY § 5-304: candidates resident in New York City must
 * be notified at least ten business days before an automated employment
 * decision tool is used, with instructions for requesting an alternative
 * selection process or a reasonable accommodation.
 *
 * § 5-303: the bias audit summary must be published on the employment section
 * of the website, clearly and conspicuously.
 */
export const CANDIDATE_NOTICE_DAYS = 10;

export const BIAS_AUDIT_SUMMARY_URL = '/careers/bias-audit-2026';

export function CandidateNotice() {
  return (
    <section aria-labelledby="aedt-notice">
      <h2 id="aedt-notice">How we use automated tools in hiring</h2>
      <p>
        We use an automated employment decision tool to help us prioritise applications. It produces a
        recommendation; a person always makes the decision. You are being told at least {CANDIDATE_NOTICE_DAYS}{' '}
        business days before it is used on your application.
      </p>
      <p>
        <strong>Data we collect:</strong> your resume text and the answers you give in the application form.
        <br />
        <strong>Source:</strong> you. <strong>Retention:</strong> 190 days after the requisition closes.
      </p>
      <p>
        To request an alternative selection process or a reasonable accommodation, email{' '}
        <a href="mailto:accommodations@hireflow.example">accommodations@hireflow.example</a>.
      </p>
      <p>
        <a href={BIAS_AUDIT_SUMMARY_URL}>Read our most recent bias audit results</a> (published 2026-07-14).
      </p>
    </section>
  );
}
