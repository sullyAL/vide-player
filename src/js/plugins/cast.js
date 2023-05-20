/**
 * Video cast / chromecast
 */

import controls from '../controls'
import { createElement, toggleClass } from '../utils/elements'
import { triggerEvent, on } from '../utils/events'
import i18n from '../utils/i18n'
import is from '../utils/is'
import loadScript from '../utils/load-script'
import { silencePromise } from '../utils/promise'
import { formatTime } from '../utils/time'
import { buildUrlParams } from '../utils/urls'
import html5 from '../html5'

class Cast {
    constructor (player) {
        this.player = player
        this.config = {
            enabled: player?.config?.cast?.enabled || true,
            contentType: player?.config?.cast?.contentType || 'video/mp4',
            src: player?.config?.cast?.src || player.media.currentSrc
        }
        this.remotePlayerController = null
        this.castPlayer = null
        this.paused = false
        this.playing = false
        this.initialized = false
        this.events = {}
        this.hasConnected = false

        this.load()
    }

    load = () => {
        const { config } = this

        if (!config.enabled)
            return

        if (!chrome?.cast) {
            loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1')
                .then(() => {
                    setTimeout(() => this.initiate(), 1000)
                })
                .catch(() => {
                    // Script failed to load or is blocked
                    this.trigger('error', new Error('Video cast failed to load'))
                })
        } else {
            this.initiate()
        }
    }

    initiate = () => {
        const { config } = this

        // Return if chrome cast not  present
        if (!config.enabled || !this.isSupported)
            return

        this.castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
        })

        // Check if cast is supported
        if (this.isSupported && this.config.enabled) {
            const { elements } = this.player

            const defaultAttributes = { class: 'vide__controls__item' }
            const container = elements.container.querySelector('.vide__controls.vide__controls__top')

            const button = controls.createButton.call(this.player, 'cast', defaultAttributes)
            elements.buttons.chromeCast = button

            on.call(this.player, button, 'click', () => {
                this.connect()
            })

            container.appendChild(button)
        }
    }

    /**
     * Get cast status
     * @returns {*}
     */
    get status() {
        return cast.framework.CastContext.getInstance().getCastState()
    }

    /**
     * Get cast instance
     * @returns {*}
     */
    get castContext() {
        return cast.framework.CastContext.getInstance()
    }

    /**
     * Get current cast sessions
     * @returns {*}
     */
    get castSession() {
        return this.castContext.getCurrentSession()
    }

    /**
     * Remote player controller
     * @returns {cast.framework.RemotePlayerController}
     */
    setupPlayerController() {
        const { elements } = this.player

        const player = new cast.framework.RemotePlayer()
        this.castPlayer = player
        this.playing = true
        this.remotePlayerController =  new cast.framework.RemotePlayerController(player)

        // Set state
        Array.from(elements.buttons.play || []).forEach((target) => {
            Object.assign(target, { pressed: true })
            target.setAttribute('aria-label', i18n.get('play', this.config))
        })
    }

    /**
     * Check if we can play the media
     * @returns {*}
     */
    get canPlay() {
        const context = cast.framework.CastReceiverContext.getInstance()

        return context.canDisplayType(this.config.contentType)
    }

    /**
     * Check if cast api is available
     * @returns {*|{enabled: boolean}|Cast}
     */
    get isSupported() {
        return !!window?.chrome && window?.chrome?.cast && window?.cast
    }

    /**
     * Check if cast connected
     * @returns {*|{enabled: boolean}|Cast|boolean|boolean}
     */
    get isConnected() {
        return this.isSupported && this.status === cast.framework.CastState.CONNECTED && this.hasConnected
    }

    /**
     * Connect to cast device
     */
    connect = () => {
        this.castContext.requestSession()
            .then(() => {
                this.loadMedia()
                this.hasConnected = true

                this.hideElements()
            }, () => {
                // nothing here
            })
    }

    hideElements = () => {
        if (!this.isConnected)
            return

        const { elements } = this.player

        // Change button
        elements?.buttons?.chromeCast?.classList?.add('vide__control--pressed')

        // hide elements
        const bottomContainer = elements.container.querySelector('.vide__controls.vide__controls__bottom')
        const poster = elements.poster

        elements.container.classList.add(this.player.config.classNames.hideControls)

        poster.style.opacity = 1
        bottomContainer.style.display = 'none'
        elements.buttons.pip.style.display = 'none'

        toggleClass(elements.container, 'vide__chromeCast', true)
    }

    /**
     * Load media
     * @returns {Promise<void>}
     */
    loadMedia = () => {
        const player = this.player
        const mediaInfo = new chrome.cast.media.MediaInfo(this.config.src, this.config.contentType)
        const request = new chrome.cast.media.LoadRequest(mediaInfo)

        // Track cast state
        const context = this.castContext
        context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, () => {
            const status = this.status

            if (status === 'NOT_CONNECTED') {
                this.normalPlayer()
            }
        })

        this.castSession.loadMedia(request)
            .then(() => {
                console.log('Load succeed')
                player.pause()
                this.setupPlayerController()
                this.listeners()
            })
            .catch(error => {
                console.log('Error code: ' + error)
            })
    }

    /**
     * Revert back to main player
     */
    normalPlayer = () => {
        const { elements, media } = this.player

        // Change button
        elements?.buttons?.chromeCast?.classList?.remove('vide__control--pressed')

        // hide elements
        const bottomContainer = elements.container.querySelector('.vide__controls.vide__controls__bottom')
        const poster = elements.poster

        elements.container.classList.add(this.player.config.classNames.hideControls)

        poster.style.opacity = 0
        bottomContainer.style.display = ''
        elements.buttons.pip.style.display = ''

        toggleClass(elements.container, 'vide__chromeCast', false)
        html5.setup.call(this.player)
    }

    /**
     * Listens to video player cast controls
     */
    listeners = () => {
        const player = this.player
        const playerController = this.remotePlayerController
        const { media } = player

        const events = [
            cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
            cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED,
            cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED
        ]

        // add events
        events.forEach(event => {
            playerController.addEventListener(event, () => {
                switch (event) {
                    case cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED:
                        this.paused = this.castPlayer.isPaused
                        this.playing = !this.castPlayer.isPaused

                        // Set state
                        Array.from(this.player.elements.buttons.play || []).forEach((target) => {
                            Object.assign(target, { pressed: this.playing })
                            target.setAttribute('aria-label', i18n.get(this.playing ? 'pause' : 'play', this.config))
                        })

                        break
                    default:
                        // do nothing
                }
            })
        })

        media.play = () => {
            return playerController.playOrPause()
        }

        media.pause = () => {
            return playerController.playOrPause()
        }

        media.stop = () => {
            return playerController.stop()

        }

        // Seeking
        let { currentTime } = media
        Object.defineProperty(media, 'currentTime', {
            get() {
                return currentTime
            },
            set(time) {
                media.seeking = true
                triggerEvent.call(player, media, 'seeking')
                playerController.seek(time)
            },
        })

        // Volume
        const { volume: _volume } = player.config
        Object.defineProperty(media, 'volume', {
            get() {
                return _volume
            },
            set(input) {
                playerController.setVolumeLevel(input)
                triggerEvent.call(player, media, 'volumechange')
            },
        })

        // Muted
        const { muted } = player.config;
        Object.defineProperty(media, 'muted', {
            get() {
                return muted
            },
            set(input) {
                playerController.muteOrUnmute()
            },
        })
    }

    /**
     * Trigger events
     * @param event
     * @param args
     */
    trigger = (event, ...args) => {
        const handlers = this.events[event]

        if (is.array(handlers)) {
            handlers.forEach((handler) => {
                if (is.function(handler)) {
                    handler.apply(this, args)
                }
            })
        }
    }
}

export default Cast
