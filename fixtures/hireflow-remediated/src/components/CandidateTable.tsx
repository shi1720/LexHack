'use client';

import type { ScreeningResult } from '../screening/rank';

export function CandidateTable({ results }: { results: ScreeningResult[] }) {
  return (
    <table>
      <thead>
        <tr><th>Applicant</th><th>Fit score</th><th>Status</th></tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.applicantId}>
            <td>{r.applicantId}</td>
            <td>{(r.candidateScore * 100).toFixed(0)}%</td>
            <td>{r.decision === 'advance' ? 'Shortlisted' : 'Filtered out'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
