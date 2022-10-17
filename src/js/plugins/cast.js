/**
 * Video cast / chromecast
 */

import controls from '../controls'
import { createElement } from '../utils/elements';
import { triggerEvent, on } from '../utils/events';
import i18n from '../utils/i18n';
import is from '../utils/is';
import loadScript from '../utils/load-script';
import { silencePromise } from '../utils/promise';
import { formatTime } from '../utils/time';
import { buildUrlParams } from '../utils/urls';

class Cast {
    constructor (player) {
        this.player = player
        this.config = {
            enabled: player?.config?.cast?.enabled || true,
            contentType: player?.config?.cast?.contentType || 'video/mp4',
            src: player?.config?.cast?.src || player.media.currentSrc
        }
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
        // Return if chrome cast not  present
        if (!chrome?.cast)
            return

        this.castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
        })

        // Check if cast is supported
        if (this.isSupported && this.config.enabled) {
            const { elements } = this.player

            const defaultAttributes = { class: 'plyr__controls__item' }
            const container = elements.container.querySelector('.plyr__controls.plyr__controls__top')

            const button = controls.createButton.call(this.player, 'cast', defaultAttributes)

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
    get playerController() {
        const castPlayer = new cast.framework.RemotePlayer()

        return new cast.framework.RemotePlayerController(castPlayer)
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
        return window.chrome && window.chrome.cast && window.cast
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

        const bottomContainer = elements.container.querySelector('.plyr__controls.plyr__controls__top')
        const centerContainer = elements.container.querySelector('.plyr__controls.plyr__controls__center')
        const poster = elements.container.querySelector('.plyr__poster')

        elements.container.classList.add(this.player.config.classNames.hideControls)

        poster.style.zIndex = '99999999'
        bottomContainer.style.display = 'none'
        //centerContainer.style.display = 'none'
    }

    /**
     * Load media
     * @returns {Promise<void>}
     */
    loadMedia = () => {
        const mediaInfo = new chrome.cast.media.MediaInfo(this.config.src, this.config.contentType)
        const request = new chrome.cast.media.LoadRequest(mediaInfo)

        this.castSession.loadMedia(request)
            .then(() => {
                console.log('Load succeed')
                this.listeners()
            })
            .catch(error => {
                console.log('Error code: ' + error)
            })
    }

    /**
     * Listens to video player cast controls
     */
    listeners = () => {
        const player = this.player
        const playerController = this.playerController
        const { media, paused, volume } = player


        media.play = () => {
            return playerController.playOrPause()
        }

        media.pause = () => {
            return playerController.playOrPause()
        }

        media.stop = () => {
            return playerController.stop()
            player.currentTime = 0
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

                console.log(playerController)

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
