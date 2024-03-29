import '@splidejs/splide/css'
import Splide from '@splidejs/splide'

import controls from '../controls'
import {createElement, toggleHidden, toggleClass, removeElement} from '../utils/elements'

import { on, off } from '../utils/events'
import is from '../utils/is'

import { getPercentage } from '../utils/strings'
import PreviewThumbnails from './preview-thumbnails'

import source from '../source'
import support from '../support'
import ui from '../ui'
import media from '../media'
import html5 from '../html5'

class Playlist {
    constructor(player) {
        this.player = player
        this.config = {
            enabled: player?.config?.playlist?.enabled && player?.config?.playlist?.list.length > 0 || false,
            list: player?.config?.playlist?.list || [],
            onChange: player?.config?.playlist?.onChange || null
        }
        this.show = false
        this.slider = null

        this.load()
    }

    load = () => {
        const { config } = this

        if (!config.enabled)
            return

        this.initiate()
    }

    initiate = () => {
        const { player } = this
        const { elements: { buttons, playlist } } = player

        const defaultAttributes = { class: 'vide__controls__item' }
        const button = controls.createButton.call(player, 'playlist', defaultAttributes)

        const parent = buttons.fullscreen.parentNode
        parent.insertBefore(button, buttons.fullscreen)

        on.call(player, button, 'click', () => {
            const { show } = this

            this.toggleList(!show)
        })

        // Create playlist list
        this.createList()
    }

    toggleList = (toggle = false) => {
        const { player, slider, config: data } = this
        const { elements: { playlist, container }, config } = player

        this.show = toggle
        toggleHidden(playlist.container, !toggle)

        toggleClass(container, config.classNames.menu.open, toggle)
        toggleClass(container, 'playlistOpened', toggle)

        // Move to active slide
        if (slider && toggle) {
            const index = data.list.findIndex(item => !!item?.playing)
            slider.go(index)
        }

        // Disable / enable player key shortcuts
        if (toggle) {
            on.call(player, document, 'keydown', this.keyShortcuts, false)
            player.pause()
        } else {
            off.call(player, document, 'keydown', this.keyShortcuts, false)
        }
    }

    playlistEvent = (event) => {
        event.preventDefault()
        event.stopPropagation()

        const { player } = this
        const { elements: { playlist } } = player

        if (event.target !== playlist.container)
            return false

        if (!playlist.container.includes(event.target))
            return false
    }

    play = (event, index) => {
        event.preventDefault()
        event.stopPropagation()

        this.playVideo(index)
    }

    destroyEvents = () => {
        const { player, slider } = this
        const { elements: { playlist } } = player

        off.call(player, playlist.container, 'click dblclick', this.playlistEvent, false)
        off.call(player, playlist.closeButton, 'click', () => {
            this.toggleList(false)
        })

        playlist.playButtons.forEach((item, index) => {
            off.call(player, item, 'click dblclick', (event) => this.play(event, index), false)
        })

        player.elements.playlist = {}
        playlist.container.remove()

        slider.destroy(true)
        this.slider = null
    }

    createList = () => {
        const { player, config } = this
        const { elements  } = player
        const { container } = elements

        const playlist = createElement('div', {
            class: 'playList',
            hidden: true
        })

        on.call(player, playlist, 'click dblclick', this.playlistEvent, false)

        elements.playlist = {}
        elements.playlist.playButtons = []

        const header = createElement('h2', {
            class: 'title'
        })
        header.innerText = 'Please choose a video from the playlist below!'

        const closeButton = controls.createButton.call(player, 'close', {
            class: 'close'
        })
        closeButton.innerHTML += '<span>Close</span>'

        on.call(player, closeButton, 'click', () => {
            this.toggleList(false)
        })

        const slider = createElement('div', {
            class: 'splide'
        })

        const tracks = createElement('div', {
            class: 'splide__track'
        })

        const list = createElement('div', {
            class: 'playList__list splide__list'
        })

        let start = 0
        config.list.forEach((item, index) => {
            const video = createElement('div', {
                class: `playList__item splide__slide ${item.code === player?.config?.code ? 'playList__item--isPlaying' : ''}`
            })

            const innerContent = createElement('div', {
                class: 'playList__item__inner'
            })

            const image = createElement('img', {
                src: item.poster
            })

            const content = createElement('div', {
                class: 'playList__item__content'
            })

            const title = createElement('h4')

            const watchedBefore = Number(localStorage?.getItem(`watched_${item?.code}`) || 0)
            const percentageValue = getPercentage(watchedBefore, item.length)

            const formattedLength = controls.formatTime(item.length, false)
            const formattedWatched = controls.formatTime(watchedBefore, false)

            const length = createElement('span')
            length.innerText = `${formattedWatched} / ${formattedLength}`

            const playIcon = controls.createIcon.call(player, 'play-alt')
            const playButton = createElement('button', {
                type: 'button',
                class: 'vide__control'
            })

            on.call(player, playButton, 'click dblclick', (event) => this.play(event, index), false)

            if (item.code === player?.config?.code) {
                const headline = createElement('small')
                headline.innerText = 'Currently playing'

                title.appendChild(headline)
                start = index
            }

            title.innerHTML += item.title

            const progress = createElement('div', {
                class: 'progress'
            })
            const innerProgress = createElement('div', {
                class: 'progress__inner'
            })

            innerProgress.style.width = percentageValue + '%'

            playButton.appendChild(playIcon)

            progress.appendChild(innerProgress)
            title.appendChild(length)

            content.appendChild(title)
            content.appendChild(progress)

            innerContent.appendChild(image)
            innerContent.appendChild(content)

            video.appendChild(innerContent)
            video.appendChild(playButton)

            list.appendChild(video)

            elements.playlist.playButtons.push(playButton)
        })

        tracks.appendChild(list)
        slider.appendChild(tracks)

        playlist.appendChild(header)
        playlist.appendChild(slider)
        playlist.appendChild(closeButton)

        container.appendChild(playlist)
        elements.playlist.container = playlist
        elements.playlist.closeButton = closeButton

        // Initiate slider
        const splide = new Splide('.splide', {
            focus: 'center',
            type: config.list.length > 3 ? 'loop' : 'slide',
            drag: 'free',
            autoHeight: true,
            pagination: false,
            gap: 30,
            wheel: true,
            start,
            perPage: 5,
            slideFocus: true,
            updateOnMove: true,
            trimSpace: true,
            wheelSleep: 600,
            breakpoints: {
                1024: {
                    direction: 'ttb',
                    perPage: 3,
                    autoWidth: true,
                    height: '100%'
                },
                600: {
                }
            }
        })

        splide.mount()
        this.slider = splide

        on.call(player, document, 'keydown', this.keyShortcuts, false)

        splide.on('click', (slide, event) => {
            const { slider } = this

            if (slider)
                slider.go(slide.index)
        })
    }

    reloadHLS = (item) => {
        const { player } = this

        // Set video title
        player.config.title = item.title

        // Setup captions
        if (Object.keys(item).includes('tracks')) {
            source.insertElements.call(player, 'track', item.tracks)
        }

        // Update previewThumbnails config & reload plugin
        if (!is.empty(item.previewThumbnails)) {
            Object.assign(player.config.previewThumbnails, item.previewThumbnails);

            // Cleanup previewThumbnails plugin if it was loaded
            if (player.previewThumbnails && player.previewThumbnails.loaded) {
                player.previewThumbnails.destroy()
                player.previewThumbnails = null
            }

            // Create new instance if it is still enabled
            if (player.config.previewThumbnails.enabled) {
                player.previewThumbnails = new PreviewThumbnails(player)
            }
        }

        // Update the fullscreen support
        player.fullscreen.update()

        // Update poster
        player.poster = item.poster
    }

    resetVideo = (quality = [], item = null) => {
        const { player } = this

        // Cancel current network requests
        html5.cancelRequests.call(player)

        // Destroy instance and re-setup
        player.destroy.call(
            player,
            () => {
                // Reset quality options
                player.options.quality = quality

                // Remove elements
                removeElement(player.media)
                player.media = null

                // Reset class name
                if (is.element(player.elements.container)) {
                    player.elements.container.removeAttribute('class')
                }

                // Set the type and provider
                Object.assign(this, {
                    provider: 'html5',
                    type: 'video',
                    // Check for support
                    supported: support.check(type, 'html5', player.config.playsinline),
                    // Create new element
                    media: createElement('div', {}),
                })

                // Inject the new element
                player.elements.container.appendChild(player.media)

                // Autoplay the new source?
                if (is.boolean(item?.autoplay)) {
                    player.config.autoplay = item?.autoplay
                }

                // Set attributes for audio and video
                if (player.isHTML5) {
                    if (player.config.crossorigin) {
                        player.media.setAttribute('crossorigin', '')
                    }
                    if (player.config.autoplay) {
                        player.media.setAttribute('autoplay', '')
                    }
                    if (!is.empty(item?.poster)) {
                        player.poster = item?.poster
                    }
                    if (player.config.loop.active) {
                        player.media.setAttribute('loop', '')
                    }
                    if (player.config.muted) {
                        player.media.setAttribute('muted', '')
                    }
                    if (player.config.playsinline) {
                        player.media.setAttribute('playsinline', '');
                    }
                }

                // Restore class hook
                ui.addStyleHook.call(player)

                // Set video title
                player.config.title = item?.title

                // Set up from scratch
                media.setup.call(player)

                // Setup captions
                if (Object.keys(item).includes('tracks')) {
                    source.insertElements.call(player, 'track', item?.tracks)
                }

                // Update previewThumbnails config & reload plugin
                if (!is.empty(item?.previewThumbnails)) {
                    Object.assign(player.config.previewThumbnails, item?.previewThumbnails)

                    // Cleanup previewThumbnails plugin if it was loaded
                    if (player.previewThumbnails && player.previewThumbnails.loaded) {
                        player.previewThumbnails.destroy()
                        player.previewThumbnails = null
                    }

                    // Create new instance if it is still enabled
                    if (player.config.previewThumbnails.enabled) {
                        player.previewThumbnails = new PreviewThumbnails(player)
                    }
                }

                // Update the fullscreen support
                player.fullscreen.update()

                // Update playlist
                if (player?.config?.playlist?.enabled && player?.config?.playlist?.list?.length > 0) {
                    player.playlist = new Playlist(player)
                }
            },
            true
        )
    }

    playVideo = (itemIndex = -1) => {
        if (itemIndex < 0)
            return

        const { config, player } = this
        const item = config.list.find((item, index) => index === itemIndex)

        if (player.config.code === item.code) {
            this.toggleList(false)
            player.play()
            return
        }

        player.config.code = item.code

        this.toggleList(false)
        this.destroyEvents()

        // Check if is hls
        if (!player?.config?.isHLS) {
            player.source = item
        }

        config.onChange(item, player)
    }

    keyShortcuts = (event) => {
        event.preventDefault()
        event.stopPropagation()

        const { slider } = this

        if (event.code === 'ArrowRight' || event.key === 'ArrowRight' || event.keyCode === 39)
            slider.go('>')

        if (event.code === 'ArrowLeft' || event.key === 'ArrowLeft' || event.keyCode === 37)
            slider.go('<')

        if (event.code === 'Escape' || event.keyCode === 27) {
            this.toggleList(false)
        }

        return false
    }
}

export default Playlist
