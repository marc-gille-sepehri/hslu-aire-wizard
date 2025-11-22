import './DimensionOverview.css'

function DimensionOverview({ dimensions, currentDimension, answers, onDimensionClick }) {
  const getDimensionProgress = (dim) => {
    const answered = dim.questions.filter((_, index) => {
      const key = `${dim.id}-${index}`
      return answers[key] !== undefined
    }).length
    return (answered / dim.questions.length) * 100
  }

  return (
    <div className="dimension-overview">
      <h3 className="overview-title">Dimensionen</h3>
      <div className="dimension-list">
        {dimensions.map((dim, index) => {
          const progress = getDimensionProgress(dim)
          const isActive = index === currentDimension
          const isComplete = progress === 100

          return (
            <div
              key={dim.id}
              className={`dimension-item ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
              onClick={() => onDimensionClick(index)}
            >
              <div className="dimension-item-header">
                <span className="dimension-item-icon">
                  {dim.icon && (() => {
                    const IconComponent = dim.icon
                    return <IconComponent />
                  })()}
                </span>
                <span className="dimension-item-title">{dim.title}</span>
              </div>
              <div className="dimension-item-progress">
                <div className="dimension-progress-bar">
                  <div
                    className="dimension-progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="dimension-progress-text">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DimensionOverview

