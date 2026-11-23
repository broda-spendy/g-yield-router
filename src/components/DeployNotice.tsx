import { Notice } from "./ui/notice";

/**
 * Shown wherever money would move but the contract has not been deployed yet. The app stays usable,
 * the amounts stay visible, and nothing is signed.
 */
export function DeployNotice({ className }: { className?: string }) {
  return (
    <Notice tone="info" title="Deploy the gift contract to go live" className={className}>
      Until Sente's contract is deployed on Celo, a gift is written down on this device only. No G$ moves and nothing is signed.
    </Notice>
  );
}
