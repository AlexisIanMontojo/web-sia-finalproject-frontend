import Swal from 'sweetalert2';

const theme = {
  confirmButtonColor: '#174d38',
  cancelButtonColor: '#6b7b74',
};

export function toast(icon, title) {
  return Swal.fire({
    ...theme,
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}

export function showError(title, text) {
  return Swal.fire({ ...theme, icon: 'error', title, text });
}

export async function confirmDelete(name) {
  const result = await Swal.fire({
    ...theme,
    icon: 'warning',
    title: 'Delete this item?',
    text: `"${name}" will be permanently removed.`,
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    confirmButtonColor: '#b91c1c',
  });
  return result.isConfirmed;
}