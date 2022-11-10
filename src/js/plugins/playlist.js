import '@splidejs/splide/css'
import Splide from '@splidejs/splide'

import controls from '../controls'
import { createElement, toggleHidden, toggleClass } from '../utils/elements'

import { on, off } from '../utils/events'
import is from '../utils/is'
import {getPercentage} from '../utils/strings'

class Playlist {
    constructor(player) {
        this.player = player
        this.config = {
            enabled: player?.config?.playlist?.enabled && player?.config?.playlist?.list.length > 0 || false,
            list: player?.config?.playlist?.list || []
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

        const defaultAttributes = { class: 'plyr__controls__item' }
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
                class: `playList__item splide__slide ${item?.playing ? 'playList__item--isPlaying' : ''}`
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
                class: 'plyr__control'
            })

            on.call(player, playButton, 'click dblclick', (event) => this.play(event, index), false)

            if (item.code === player?.config?.code) {
                const headline = createElement('small')
                headline.innerText = 'Currently playing'

                title.appendChild(headline)
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

            if (item?.code === player?.config?.code)
                start = index
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
            cloneStatus: false,
            slideFocus: true,
            updateOnMove: true,
            trimSpace: true,
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

    playVideo = (itemIndex = -1) => {
        if (itemIndex < 0)
            return

        const { config, player } = this
        const item = config.list.find((item, index) => index === itemIndex)

        if (player.config.code === item.code)
            return

        player.config.code = item.code

        this.toggleList(false)
        this.destroyEvents()

        player.source = item
    }

    keyShortcuts = (event) => {
        event.preventDefault()
        event.stopPropagation()

        const { slider } = this

        if (event.code === 'ArrowRight' || event.key === 'ArrowRight' || event.keyCode === 39)
            slider.go('>')

        if (event.code === 'ArrowLeft' || event.key === 'ArrowLeft' || event.keyCode === 37)
            slider.go('<')

        return false
    }
}

export default Playlist
