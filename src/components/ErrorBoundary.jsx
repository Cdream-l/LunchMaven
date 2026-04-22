import { Component } from 'react'
import { Alert, Button, Typography } from 'antd'

const { Paragraph, Title } = Typography

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '24px',
          background: 'linear-gradient(135deg, #fff8ee 0%, #f4efe8 52%, #eef3f7 100%)'
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <Alert
              message="出错了"
              description={
                <div>
                  <Title level={4}>页面加载出现问题</Title>
                  <Paragraph>
                    抱歉，页面遇到了一些技术问题。请尝试刷新页面或联系技术支持。
                  </Paragraph>
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <div style={{ marginTop: '16px' }}>
                      <Paragraph>
                        <strong>错误信息：</strong>
                      </Paragraph>
                      <pre style={{ 
                        background: '#f5f5f5', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {this.state.error.toString()}
                      </pre>
                    </div>
                  )}
                  <Button type="primary" onClick={this.handleReset} style={{ marginTop: '16px' }}>
                    重试
                  </Button>
                </div>
              }
              type="error"
              showIcon
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary