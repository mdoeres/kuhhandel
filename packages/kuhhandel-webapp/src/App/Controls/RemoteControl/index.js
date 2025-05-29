import React, { Component } from 'react'
import { Control } from 'kuhhandel-components'
import Peer from 'simple-peer'
import './RemoteControl.css'

const peerConfig = {
  initiator: true,
  trickle: false,
  config: {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  }
}

class Connect extends Component {
  render() {
    const { link, connected, id } = this.props
    const placeholder = `${id} ${connected ? '✅' : ' - ' + link}`
    
    return (
      <div className="connect-container">
        <button 
          className="remote-button"
          onClick={() => {
            if (link) {
              window.open(link, '_blank')
            } else {
              const remoteUrl = process.env.NODE_ENV === 'production' 
                ? 'https://kuhhandel-remote.onrender.com/remote'
                : 'http://localhost:3002'
              window.open(remoteUrl, '_blank')
            }
          }}
          title="Open Remote Control in new tab"
        >
          Open Remote Control
        </button>
        <form ref={f => this.form = f} onSubmit={this.onSubmit}>
          <input className="connect" type="text" name="id" placeholder={placeholder} title={`Open ${link} in your smartphone`} />
        </form>
      </div>
    )
  }

  onSubmit = async e => {
    e.preventDefault()
    const id = this.form.id.value
    const data = JSON.parse(atob(id.split('?connect=')[1]))
    this.props.onSubmit(data)
    this.form.reset()
  }
}

class Remote extends Component {
  state = {
    connected: false,
    link: '',
    peer: new Peer(peerConfig)
  }

  componentDidMount() {
    this.initPeer()
  }

  componentWillReceiveProps(nextProps) {
    this.onSendProps(nextProps)
  }

  render() {
    const { link, connected } = this.state
    return <Connect
      onSubmit={this.onConnect}
      link={link}
      connected={connected}
      id={this.props.id}
    />
  }

  initPeer = () => {
    const { peer } = this.state
    peer.once('signal', this.onSignal)
    peer.on('connect', () => {
      console.log('Peer connected, sending initial props')
      const gameState = {
        ...this.props,
        method: 'init',
        payload: this.props
      }
      peer.send(JSON.stringify(gameState))
      this.setState({ connected: true })
    })
    peer.on('data', data => {
      console.log('Received data from peer:', data)
      try {
        const parsedData = JSON.parse(data)
        if (parsedData.method) {
          this.onData(parsedData)
        }
      } catch (err) {
        console.error('Error parsing received data:', err)
      }
    })
    peer.on('close', () => {
      console.log('Peer connection closed, reinitializing')
      this.setState({ link: '', connected: false, peer: new Peer(peerConfig) }, this.initPeer)
    })
    peer.on('error', err => {
      console.error('Peer error:', err)
      this.setState({ link: '', connected: false, peer: new Peer(peerConfig) }, this.initPeer)
    })
  }

  onConnect = data => {
    console.log('Received connection data:', data)
    try {
      if (this.state.peer && !this.state.peer.destroyed) {
        this.state.peer.signal(data)
      } else {
        console.log('Creating new peer for connection')
        const newPeer = new Peer(peerConfig)
        newPeer.signal(data)
        this.setState({ peer: newPeer }, this.initPeer)
      }
    } catch (err) {
      console.error('Error handling connection:', err)
      this.setState({ link: '', connected: false, peer: new Peer(peerConfig) }, this.initPeer)
    }
  }

  onData = data => {
    console.log('Received data:', data)
    this.props[data.method](data.payload)
  }

  onSendProps = props => {
    if (this.state.peer && this.state.peer.connected) {
      console.log('Sending updated props:', props)
      const gameState = {
        ...props,
        method: 'update',
        payload: props
      }
      this.state.peer.send(JSON.stringify(gameState))
    }
  }

  onSignal = signalData => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://kuhhandel-remote.onrender.com/remote'
      : `http://${window.location.host}`
    const signalDataStr = btoa(JSON.stringify(signalData))
    const link = `${baseUrl}?signalData=${signalDataStr}`
    console.log('Generated remote control link:', link)
    this.setState({ link })
  }
}

const RemoteControl = props => [
  <Remote key="remote" {...props} />,
  <div key="local" className="local">
    <Control {...props} />
  </div>,
]

export default RemoteControl
