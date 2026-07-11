import { IconX } from '@tabler/icons-react'
import toast, { ToastBar, Toaster } from 'react-hot-toast'

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 16, right: 16, left: 16 }}
      toastOptions={{
        duration: 4000,
        style: {
          maxWidth: 380,
          borderRadius: 10,
          border: '1px solid #000000',
          background: '#000000',
          color: '#ffffff',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.10)',
          padding: '12px 14px',
        },
        success: {
          iconTheme: { primary: '#ffffff', secondary: '#000000' },
        },
        error: {
          duration: Infinity,
          style: {
            border: '1px solid #b91c1c',
            background: '#fef2f2',
            color: '#b91c1c',
          },
          iconTheme: { primary: '#b91c1c', secondary: '#fef2f2' },
        },
      }}
    >
      {(currentToast) => (
        <ToastBar toast={currentToast}>
          {({ icon, message }) => (
            <div className="flex w-full items-start gap-3">
              <span className="mt-0.5 shrink-0">{icon}</span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-5">
                {message}
              </span>
              <button
                type="button"
                className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-[10px] text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                onClick={() => toast.dismiss(currentToast.id)}
                aria-label="关闭通知"
              >
                <IconX size={16} />
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  )
}
