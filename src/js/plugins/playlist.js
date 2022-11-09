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
        }, false)

        // Create playlist list
        this.createList()
    }

    toggleList = (toggle = false) => {
        const { player } = this
        const { elements: { playlist, container }, config } = player

        this.show = toggle
        toggleHidden(playlist, !toggle)

        toggleClass(container, config.classNames.menu.open, toggle)
    }

    createList = () => {
        const { player, config } = this
        const { elements  } = player
        const { container } = elements

        const playlist = createElement('div', {
            class: 'playList',
            hidden: true
        })

        const header = createElement('span', {
            class: 'title'
        })
        header.innerText = 'Playlist'

        const list = createElement('div', {
            class: 'playList__list'
        })

        config.list.forEach(item => {
            const video = createElement('div', {
                class: `playList__item ${item?.playing ? 'playList__item--isPlaying' : ''}`
            })

            const image = createElement('img', {
                src: item.poster
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

            video.appendChild(image)
            video.appendChild(title)

            playButton.appendChild(playIcon)
            video.appendChild(playButton)

            list.appendChild(video)
        })

        playlist.appendChild(header)
        playlist.appendChild(list)

        container.appendChild(playlist)
        elements.playlist = playlist
    }
}

export default Playlist
