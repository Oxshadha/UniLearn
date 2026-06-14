'use client'

import { useEffect, useRef } from 'react'

export default function BackgroundAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let width = (canvas.width = window.innerWidth)
        let height = (canvas.height = window.innerHeight)

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth
            height = canvas.height = window.innerHeight
        })

        const particles: Particle[] = []
        const particleCount = Math.min(Math.floor((width * height) / 10000), 150)

        class Particle {
            x: number
            y: number
            vx: number
            vy: number
            size: number
            color: string

            constructor() {
                this.x = Math.random() * width
                this.y = Math.random() * height
                this.vx = (Math.random() - 0.5) * 0.5
                this.vy = (Math.random() - 0.5) * 0.5
                this.size = Math.random() * 2 + 0.5
                // Solid blue color only (UniLearn Blue: #1B61D9)
                this.color = `rgba(27, 97, 217, ${0.3 + Math.random() * 0.4})`
            }

            update() {
                this.x += this.vx
                this.y += this.vy

                if (this.x < 0 || this.x > width) this.vx *= -1
                if (this.y < 0 || this.y > height) this.vy *= -1
            }

            draw() {
                if (!ctx) return
                ctx.beginPath()
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle())
        }

        function animate() {
            if (!canvas || !ctx) return
            ctx.clearRect(0, 0, width, height)

            // Solid white background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, width, height)

            particles.forEach((p) => {
                p.update()
                p.draw()
            })

            // Draw connections with solid blue
            particles.forEach((a, index) => {
                for (let j = index + 1; j < particles.length; j++) {
                    const b = particles[j]
                    const dx = a.x - b.x
                    const dy = a.y - b.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 120) {
                        ctx.beginPath()
                        ctx.strokeStyle = `rgba(27, 97, 217, ${1 - distance / 120})`
                        ctx.lineWidth = 0.5
                        ctx.moveTo(a.x, a.y)
                        ctx.lineTo(b.x, b.y)
                        ctx.stroke()
                    }
                }
            })

            requestAnimationFrame(animate)
        }

        animate()
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
        />
    )
}
