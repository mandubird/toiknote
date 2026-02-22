const UploadProgressOverlay = ({ message = '이미지를 업로드하고 있어요...', progress, hideProgress }) => {
  const percent = progress == null ? 0 : Math.round(progress)
  const isComplete = !hideProgress && percent >= 100

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full text-center">
        {isComplete ? (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4" />
        )}
        <p className="text-gray-800 font-medium mb-3">{message}</p>
        {!hideProgress && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{percent}%</p>
          </>
        )}
      </div>
    </div>
  )
}

export default UploadProgressOverlay
