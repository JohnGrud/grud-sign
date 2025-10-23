import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export interface PDFPage {
  pageNumber: number
  canvas: HTMLCanvasElement
  viewport: any
  width: number
  height: number
}

export class PDFRenderer {
  private document: PDFDocumentProxy | null = null
  private pages: PDFPage[] = []

  async loadFromUrl(url: string): Promise<void> {
    try {
      this.document = await pdfjsLib.getDocument(url).promise
      this.pages = []
    } catch (error) {
      console.error('Failed to load PDF:', error)
      throw new Error('Failed to load PDF document')
    }
  }

  async loadFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      this.document = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      this.pages = []
    } catch (error) {
      console.error('Failed to load PDF:', error)
      throw new Error('Failed to load PDF document')
    }
  }

  get pageCount(): number {
    return this.document?.numPages || 0
  }

  async renderPage(pageNumber: number, scale = 1.5): Promise<PDFPage> {
    if (!this.document) {
      throw new Error('No PDF document loaded')
    }

    const existingPage = this.pages.find(p => p.pageNumber === pageNumber)
    if (existingPage) {
      return existingPage
    }

    const page: PDFPageProxy = await this.document.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.height = viewport.height
    canvas.width = viewport.width

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise

    const pdfPage: PDFPage = {
      pageNumber,
      canvas,
      viewport,
      width: viewport.width,
      height: viewport.height,
    }

    this.pages.push(pdfPage)
    return pdfPage
  }

  async renderAllPages(scale = 1.5): Promise<PDFPage[]> {
    if (!this.document) {
      throw new Error('No PDF document loaded')
    }

    const pages: PDFPage[] = []

    for (let i = 1; i <= this.document.numPages; i++) {
      const page = await this.renderPage(i, scale)
      pages.push(page)
    }

    return pages
  }

  getPage(pageNumber: number): PDFPage | null {
    return this.pages.find(p => p.pageNumber === pageNumber) || null
  }

  getAllPages(): PDFPage[] {
    return [...this.pages]
  }

  // Convert canvas coordinates to PDF coordinates (for field positioning)
  canvasToPdfCoordinates(canvasX: number, canvasY: number, pageNumber: number): { x: number; y: number } {
    const page = this.getPage(pageNumber)
    if (!page) {
      throw new Error(`Page ${pageNumber} not found`)
    }

    // Convert from canvas coordinates to PDF coordinates
    // Canvas uses top-left origin, PDF uses bottom-left origin
    const scaleX = page.viewport.width / page.canvas.width
    const scaleY = page.viewport.height / page.canvas.height

    return {
      x: canvasX * scaleX,
      y: page.viewport.height - (canvasY * scaleY), // Flip Y coordinate
    }
  }

  // Convert PDF coordinates to canvas coordinates (for field display)
  pdfToCanvasCoordinates(pdfX: number, pdfY: number, pageNumber: number): { x: number; y: number } {
    const page = this.getPage(pageNumber)
    if (!page) {
      throw new Error(`Page ${pageNumber} not found`)
    }

    // Convert from PDF coordinates to canvas coordinates
    const scaleX = page.canvas.width / page.viewport.width
    const scaleY = page.canvas.height / page.viewport.height

    return {
      x: pdfX * scaleX,
      y: (page.viewport.height - pdfY) * scaleY, // Flip Y coordinate
    }
  }

  cleanup(): void {
    this.pages = []
    this.document = null
  }
}

// Utility functions
export const loadPDFFromFile = async (file: File): Promise<PDFRenderer> => {
  const renderer = new PDFRenderer()
  const arrayBuffer = await file.arrayBuffer()
  await renderer.loadFromArrayBuffer(arrayBuffer)
  return renderer
}

export const loadPDFFromUrl = async (url: string): Promise<PDFRenderer> => {
  const renderer = new PDFRenderer()
  await renderer.loadFromUrl(url)
  return renderer
}