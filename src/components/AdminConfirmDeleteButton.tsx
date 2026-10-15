'use client';

type DeleteAction = (formData: FormData) => Promise<void>;

export default function AdminConfirmDeleteButton({
  action,
  confirmationMessage,
  hiddenInput,
}: {
  action: DeleteAction;
  confirmationMessage: string;
  hiddenInput?: { name: string; value: string };
}) {
  return (
    <form action={action} onSubmit={event => {
      if (!window.confirm(confirmationMessage)) event.preventDefault();
    }}>
      {hiddenInput && <input type="hidden" name={hiddenInput.name} value={hiddenInput.value} />}
      <button className="btn btn-outline" type="submit" style={{ height: 36, padding: '0 12px', color: 'var(--danger)' }}>
        <i className="ph ph-trash" aria-hidden="true" />Supprimer
      </button>
    </form>
  );
}