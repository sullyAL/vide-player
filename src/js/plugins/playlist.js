import '@splidejs/splide/css'
import Splide from '@splidejs/splide'

import controls from '../controls'
import { createElement, toggleHidden, toggleClass } from '../utils/elements'

import { on, off } from '../utils/events'
import is from '../utils/is'

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
    }

    createList = () => {
        const { player, config } = this
        const { elements  } = player
        const { container } = elements

        const playlist = createElement('div', {
            class: 'playList',
            hidden: true
        })

        // const header = createElement('span', {
        //     class: 'title'
        // })
        // header.innerText = 'Playlist'

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
            title.innerText = item.title

            const length = createElement('span')
            length.innerText = controls.formatTime(item.length, false)

            const playIcon = controls.createIcon.call(player, item?.playing ? 'pause' : 'play-alt')
            const playButton = createElement('button', {
                type: 'button',
                class: 'plyr__control'
            })

            title.appendChild(length)
            content.appendChild(title)

            playButton.appendChild(playIcon)
            content.appendChild(playButton)

            innerContent.appendChild(image)
            innerContent.appendChild(content)

            video.appendChild(innerContent)
            list.appendChild(video)

            if (item?.playing)
                start = index
        })

        //playlist.appendChild(header)
        tracks.appendChild(list)
        slider.appendChild(tracks)

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
               768: {
                   direction: 'ttb',
                   height: 'calc(100vh - 200px)',
                   perPage: 3,
                   autoWidth: true
               }
            }
        })

        splide.mount()
        this.slider = splide
    }
}

export default Playlist
