/**
 * Candidate notice.
 *
 * NYC Local Law 144, 6 RCNY § 5-304: candidates resident in New York City must
 * be notified at least ten business days before an automated employment
 * decision tool is used, with instructions for requesting an alternative
 * selection process or a reasonable accommodation.
 *
 * NYC Admin. Code § 20-871(b)(2): the notice must also disclose the job
 * qualifications and characteristics the tool will use.
 *
 * § 5-303(a): the bias audit summary must be published on the employment
 * section of the website, clearly and conspicuously, carrying both the date of
 * the most recent audit (a)(1) and the distribution date of the tool (a)(2) —
 * the date we began using it, which is not the same date.
 */
export const CANDIDATE_NOTICE_DAYS = 10;

export const BIAS_AUDIT_SUMMARY_URL = '/careers/bias-audit-2026';

/** 6 RCNY § 5-303(a)(2): the distribution date — when we began using the tool. */
export const DISTRIBUTION_DATE = '2025-11-03';

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
        <strong>Job qualifications and characteristics it assesses:</strong> relevant work history, the
        skills you state, and role-specific certifications. It does not assess anything else.
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
        {/*
          Article 48(2): a high-risk AI system provided digitally takes a digital
          CE marking, and it has to be easily accessible from the interface the
          system is accessed through — not buried in a PDF.
        */}
        <a href="/conformity/declaration-of-conformity.json" aria-label="CE marking and EU declaration of conformity">
          CE
        </a>{' '}
        marking and EU declaration of conformity (Articles 47 and 48). If you believe this system infringes
        the AI Act you have the right to lodge a complaint with your national market surveillance authority
        under Article 85.
      </p>
      <p>
        <a href={BIAS_AUDIT_SUMMARY_URL}>Read our most recent bias audit results</a> (published 2026-07-14).
        We began using this tool on {DISTRIBUTION_DATE}.
      </p>
    </section>
  );
}
