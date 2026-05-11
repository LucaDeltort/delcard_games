export type CardPack = {
	id: string
	name: string
	author?: string
	authorUrl?: string
	license?: string
	basePath: string
	ext?: string // file extension, default '.png'
}
