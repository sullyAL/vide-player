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
        toggleHidden(playlist, !toggle)

        toggleClass(container, config.classNames.menu.open, toggle)

        // Move to active slide
        if (slider && toggle) {
            const index = data.list.findIndex(item => !!item?.playing)
            slider.go(index)
        }

        // Disable / enable player key shortcuts
        if (toggle) {
            on.call(player, document, 'keydown', this.keyShortcuts, false)
        } else {
            off.call(player, document, 'keydown', this.keyShortcuts, false)
        }
    }

    createList = () => {
        const { player, config } = this
        const { elements  } = player
        const { container } = elements

        const playlist = createElement('div', {
            class: 'playList',
            hidden: true
        })

        on.call(player, playlist, 'click dblclick', (event) => {
            event.preventDefault()
            event.stopPropagation()

            const { elements: { playlist } } = player

            if (event.target !== playlist)
                return false

            if (!playlist.includes(event.target))
                return false
        }, false)

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

            //const playIcon = controls.createIcon.call(player, item?.playing ? 'pause' : 'play-alt')
            const playButton = createElement('button', {
                type: 'button',
                class: 'plyr__control'
            })

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

            progress.appendChild(innerProgress)
            title.appendChild(length)

            content.appendChild(title)
            content.appendChild(playButton)
            content.appendChild(progress)

            innerContent.appendChild(image)
            innerContent.appendChild(content)

            video.appendChild(innerContent)
            list.appendChild(video)

            if (item?.code === player?.config?.code)
                start = index
        })

        tracks.appendChild(list)
        slider.appendChild(tracks)

        playlist.appendChild(header)
        playlist.appendChild(slider)
        playlist.appendChild(closeButton)

        container.appendChild(playlist)
        elements.playlist = playlist

        // Initiate slider
        const splide = new Splide('.splide', {
            focus: 'center',
            type: 'loop',
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
            breakpoints: {
                1024: {
                    direction: 'ttb',
                    height: 'calc(100vh - 20px)',
                    perPage: 3,
                    autoWidth: true
                },
                600: {
                    height: 'calc(100vh - 200px)'
                }
            }
        })

        splide.mount()
        this.slider = splide

        on.call(player, document, 'keydown', this.keyShortcuts, false)

        splide.on('click', (slide, event) => {
            const { slider, config, player } = this

            if (slider)
                slider.go(slide.index)

            const itemIndex = slide.isClone ? slide.slideIndex : slide.index
            const item = config.list.find((item, index) => index === itemIndex)

            if (player.config.code === item.code)
                return

            player.config.code = item.code
            player.source = item

            this.toggleList(false)
        })
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
