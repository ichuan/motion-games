interface ExitButtonProps {
  ariaLabel: string;
}

export function ExitButton({ ariaLabel }: ExitButtonProps) {
  return (
    <a className="exit-button" href="/" aria-label={ariaLabel}>
      ×
    </a>
  );
}
