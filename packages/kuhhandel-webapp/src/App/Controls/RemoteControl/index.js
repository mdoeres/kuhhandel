import React, { Component } from 'react'
import { Control } from 'kuhhandel-components'
import './RemoteControl.css'

class Connect extends Component {
  render() {
    const { gameId, connected } = this.props
    const placeholder = `Game ID: ${gameId}`
    const remoteUrl = process.env.NODE_ENV === 'production' 
      ? `https://kuhhandel-remote.onrender.com/remote?gameId=${gameId}`
      : `http://localhost:3002/remote?gameId=${gameId}`
    
    return (
      <div className="connect-container">
        <div className="game-id">
          <label>Game ID:</label>
          <div className="id">{gameId}</div>
          <div className="status">{connected ? '✅ Connected' : '⏳ Waiting for connection...'}</div>
        </div>
        <button 
          className="remote-button"
          onClick={() => window.open(remoteUrl, '_blank')}
          title="Open Remote Control in new tab"
        >
          Open Remote Control
        </button>
        <form ref={f => this.form = f} onSubmit={this.onSubmit}>
          <input className="connect" type="text" name="id" placeholder={placeholder} title="Game ID" />
        </form>
      </div>
    )
  }

  onSubmit = async e => {
    e.preventDefault()
    const gameId = this.form.id.value
    this.props.onSubmit(gameId)
    this.form.reset()
  }
}

class Remote extends Component {
  state = {
    connected: false,
    gameId: Math.random().toString(36).substring(2, 8),
    ws: null
  }

  componentDidMount() {
    this.initWebSocket()
  }

  componentWillUnmount() {
    if (this.state.ws) {
      this.state.ws.close()
    }
  }

  initWebSocket = () => {
    const { gameId } = this.state
    const wsUrl = process.env.NODE_ENV === 'production'
      ? `wss://kuhhandel-main.onrender.com/ws/${gameId}`
      : `ws://localhost:3002/ws/${gameId}`

    console.log('Creating WebSocket connection:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      this.setState({ connected: true })
    }

    ws.onmessage = (event) => {
      console.log('Received data:', event.data)
      try {
        const data = JSON.parse(event.data)
        if (data.method) {
          this.onData(data)
        }
      } catch (err) {
        console.error('Error parsing received data:', err)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket connection closed')
      this.setState({ connected: false, ws: null })
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      this.setState({ connected: false, ws: null })
    }

    this.setState({ ws })
  }

  render() {
    const { gameId, connected } = this.state
    return <Connect
      onSubmit={this.onConnect}
      gameId={gameId}
      connected={connected}
    />
  }

  onConnect = gameId => {
    console.log('Received game ID:', gameId)
    this.setState({ gameId }, this.initWebSocket)
  }

  onData = data => {
    console.log('Received data:', data)
    this.props[data.method](data.payload)
  }

  onSendProps = props => {
    if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
      console.log('Sending updated props:', props)
      const gameState = {
        ...props,
        method: 'update',
        payload: props
      }
      this.state.ws.send(JSON.stringify(gameState))
    }
  }
}

const RemoteControl = props => [
  <Remote key="remote" {...props} />,
  <div key="local" className="local">
    <Control {...props} />
  </div>,
]

export default RemoteControl
