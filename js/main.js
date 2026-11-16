document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.nav-toggle');
    const hero = document.querySelector('.hero');
    const canvas = hero && hero.querySelector('.hero-canvas');
    const navLinks = nav ? Array.from(nav.querySelectorAll('a')) : [];

    if (nav && toggle) {
        toggle.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        navLinks.forEach((link) => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });

        const normalizePath = (pathname) => {
            const decodedPath = decodeURIComponent(pathname);
            return (decodedPath.endsWith('/') ? `${decodedPath}index.html` : decodedPath).toLowerCase();
        };
        const currentPath = normalizePath(window.location.pathname);
        const currentPageLink = navLinks.find((link) => {
            const target = new URL(link.href);
            return !target.hash && normalizePath(target.pathname) === currentPath;
        });
        const setCurrentLink = (activeLink, current = 'page') => {
            navLinks.forEach((link) => {
                if (link === activeLink) link.setAttribute('aria-current', current);
                else link.removeAttribute('aria-current');
            });
        };

        if (currentPageLink) setCurrentLink(currentPageLink);

        const sectionTargets = navLinks.map((link) => {
            const target = new URL(link.href);
            return {
                link,
                section: target.hash && normalizePath(target.pathname) === currentPath
                    ? document.getElementById(decodeURIComponent(target.hash.slice(1)))
                    : null
            };
        }).filter((target) => target.section);

        if (currentPageLink && sectionTargets.length) {
            const visibleSections = new Map();
            const updateCurrentSection = () => {
                let activeTarget = null;
                let highestRatio = 0;
                visibleSections.forEach((ratio, target) => {
                    if (ratio > highestRatio) {
                        highestRatio = ratio;
                        activeTarget = target;
                    }
                });
                setCurrentLink(activeTarget ? activeTarget.link : currentPageLink, activeTarget ? 'location' : 'page');
            };
            const sectionObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const target = sectionTargets.find((item) => item.section === entry.target);
                    if (!target) return;
                    if (entry.isIntersecting) visibleSections.set(target, entry.intersectionRatio);
                    else visibleSections.delete(target);
                });
                updateCurrentSection();
            }, { rootMargin: '-18% 0px -56% 0px', threshold: [0, .1, .25, .5, .75] });

            sectionTargets.forEach((target) => {
                sectionObserver.observe(target.section);
                target.link.addEventListener('click', () => setCurrentLink(target.link, 'location'));
            });
            window.addEventListener('hashchange', () => {
                const target = sectionTargets.find((item) => item.link.hash === window.location.hash);
                setCurrentLink(target ? target.link : currentPageLink, target ? 'location' : 'page');
            });

            const initialSection = sectionTargets.find((target) => target.link.hash === window.location.hash);
            if (initialSection) setCurrentLink(initialSection.link, 'location');
        }
    }

    document.querySelectorAll('form[data-static-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const status = form.querySelector('.form-status');
            if (status) {
                status.textContent = form.dataset.success || 'Merci. Ce formulaire nécessite encore une connexion à un service de traitement.';
            }
            form.reset();
        });
    });

    if (hero && canvas) {
        const context = canvas.getContext('2d');

        if (context) {
            const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            const pointer = { x: -1000, y: -1000, active: false };
            let particles = [];
            let width = 0;
            let height = 0;
            let frame = 0;
            let lastTime = 0;
            let visible = true;

            const resize = () => {
                const bounds = hero.getBoundingClientRect();
                const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
                width = bounds.width;
                height = bounds.height;
                canvas.width = Math.round(width * pixelRatio);
                canvas.height = Math.round(height * pixelRatio);
                context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

                const lowPower = (navigator.hardwareConcurrency || 4) <= 4;
                const count = Math.max(32, Math.min(lowPower ? 95 : 145, Math.round(width * height / (lowPower ? 9000 : 6500))));
                particles = Array.from({ length: count }, () => ({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - .5) *  .32,
                    vy: (Math.random() - .5) *  .32,
                    radius: .7 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2,
                    brightness: .35 + Math.random() * .65
                }));

                draw(0, true);
            };

            const drawGear = (x, y, radius, teeth, rotation, color) => {
                context.save();
                context.translate(x, y);
                context.rotate(rotation);
                context.beginPath();
                for (let tooth = 0; tooth < teeth; tooth += 1) {
                    const base = tooth * Math.PI * 2 / teeth;
                    [[-.5, .76], [-.3, .76], [-.22, 1], [.22, 1], [.3, .76], [.5, .76]].forEach(([offset, depth], index) => {
                        const angle = base + offset * Math.PI * 2 / teeth;
                        const px = Math.cos(angle) * radius * depth;
                        const py = Math.sin(angle) * radius * depth;
                        if (tooth === 0 && index === 0) context.moveTo(px, py);
                        else context.lineTo(px, py);
                    });
                }
                context.closePath();
                context.strokeStyle = color;
                context.lineWidth = 1.5;
                context.shadowColor = color;
                context.shadowBlur = 12;
                context.stroke();
                context.shadowBlur = 0;
                context.beginPath();
                context.arc(0, 0, radius * .55, 0, Math.PI * 2);
                context.stroke();
                for (let spoke = 0; spoke < 6; spoke += 1) {
                    const angle = spoke * Math.PI / 3;
                    context.beginPath();
                    context.moveTo(Math.cos(angle) * radius * .18, Math.sin(angle) * radius * .18);
                    context.lineTo(Math.cos(angle) * radius * .49, Math.sin(angle) * radius * .49);
                    context.stroke();
                }
                context.beginPath();
                context.arc(0, 0, radius * .17, 0, Math.PI * 2);
                context.stroke();
                context.restore();
            };

            const drawPiston = (x, y, length, phase, seconds) => {
                const extension = (Math.sin(seconds * 2.4 + phase) + 1) * length * .12;
                context.save();
                context.globalAlpha = .38;
                context.lineCap = 'round';
                context.strokeStyle = 'rgba(77, 208, 255, .76)';
                context.lineWidth = 1.5;
                context.strokeRect(x, y - 7, length * .57, 14);
                context.beginPath();
                context.moveTo(x + length * .57, y);
                context.lineTo(x + length * .75 + extension, y);
                context.stroke();
                context.beginPath();
                context.arc(x + length * .75 + extension, y, 4, 0, Math.PI * 2);
                context.stroke();
                context.restore();
            };

            const drawRobotArm = (seconds, scale) => {
                const baseX = width * .43;
                const baseY = height * .92;
                const firstLength = scale * 1.05;
                const secondLength = scale * .82;
                const firstAngle = -1.9 + Math.sin(seconds * 1.15) * .22;
                const elbowX = baseX + Math.cos(firstAngle) * firstLength;
                const elbowY = baseY + Math.sin(firstAngle) * firstLength;
                const secondAngle = firstAngle + .85 + Math.sin(seconds * 1.6) * .25;
                const wristX = elbowX + Math.cos(secondAngle) * secondLength;
                const wristY = elbowY + Math.sin(secondAngle) * secondLength;

                context.save();
                context.globalAlpha = .35;
                context.lineCap = 'round';
                context.strokeStyle = 'rgba(0, 27, 64, .75)';
                context.lineWidth = 13;
                context.beginPath();
                context.moveTo(baseX, baseY);
                context.lineTo(elbowX, elbowY);
                context.lineTo(wristX, wristY);
                context.stroke();
                context.strokeStyle = 'rgba(76, 212, 255, .78)';
                context.lineWidth = 4;
                context.shadowColor = 'rgba(0, 210, 255, .8)';
                context.shadowBlur = 8;
                context.stroke();
                context.shadowBlur = 0;
                [[baseX, baseY, 10], [elbowX, elbowY, 8], [wristX, wristY, 6]].forEach(([x, y, radius]) => {
                    context.beginPath();
                    context.arc(x, y, radius, 0, Math.PI * 2);
                    context.fillStyle = 'rgba(7, 45, 93, .95)';
                    context.fill();
                    context.strokeStyle = 'rgba(255, 184, 23, .82)';
                    context.lineWidth = 1.5;
                    context.stroke();
                });
                const gripperAngle = secondAngle + Math.sin(seconds * 1.4) * .18;
                for (let side = -1; side <= 1; side += 2) {
                    context.beginPath();
                    context.moveTo(wristX, wristY);
                    context.lineTo(wristX + Math.cos(gripperAngle + side * .6) * scale * .23, wristY + Math.sin(gripperAngle + side * .6) * scale * .23);
                    context.strokeStyle = 'rgba(112, 225, 255, .9)';
                    context.lineWidth = 2;
                    context.stroke();
                }
                context.restore();
            };

            const drawDrone = (seconds, scale) => {
                const x = width * .92 + Math.sin(seconds * .7) * scale * .16;
                const y = height * .14 + Math.sin(seconds * 1.3) * scale * .09;
                const rotorSpin = seconds * 12;
                context.save();
                context.translate(x, y);
                context.globalAlpha = .42;
                context.strokeStyle = 'rgba(101, 222, 255, .9)';
                context.lineWidth = 2;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], index) => {
                    const rotorX = dx * scale * .43;
                    const rotorY = dy * scale * .28;
                    context.beginPath();
                    context.moveTo(0, 0);
                    context.lineTo(rotorX, rotorY);
                    context.stroke();
                    context.save();
                    context.translate(rotorX, rotorY);
                    context.rotate(rotorSpin + index * Math.PI / 2);
                    context.beginPath();
                    context.ellipse(0, 0, scale * .2, scale * .055, 0, 0, Math.PI * 2);
                    context.stroke();
                    context.restore();
                    context.beginPath();
                    context.arc(rotorX, rotorY, 3, 0, Math.PI * 2);
                    context.stroke();
                });
                context.beginPath();
                context.moveTo(-scale * .17, 0);
                context.lineTo(0, -scale * .11);
                context.lineTo(scale * .17, 0);
                context.lineTo(0, scale * .11);
                context.closePath();
                context.fillStyle = 'rgba(0, 210, 255, .18)';
                context.fill();
                context.stroke();
                context.beginPath();
                context.arc(0, 0, scale * .045, 0, Math.PI * 2);
                context.fillStyle = 'rgba(255, 184, 23, .95)';
                context.fill();
                context.restore();
            };

            const drawChip = (x, y, size, seconds) => {
                const left = x - size / 2;
                const top = y - size / 2;
                context.save();
                context.globalAlpha = .32;
                context.strokeStyle = 'rgba(91, 220, 255, .82)';
                context.lineWidth = 1.2;
                context.shadowColor = 'rgba(0, 210, 255, .7)';
                context.shadowBlur = 8;
                context.strokeRect(left, top, size, size);
                context.shadowBlur = 0;
                for (let pin = 0; pin < 4; pin += 1) {
                    const offset = (pin + 1) * size / 5;
                    context.beginPath();
                    context.moveTo(left + offset, top - 7);
                    context.lineTo(left + offset, top);
                    context.moveTo(left + offset, top + size);
                    context.lineTo(left + offset, top + size + 7);
                    context.moveTo(left - 7, top + offset);
                    context.lineTo(left, top + offset);
                    context.moveTo(left + size, top + offset);
                    context.lineTo(left + size + 7, top + offset);
                    context.stroke();
                }
                context.fillStyle = 'rgba(5, 37, 83, .72)';
                context.fillRect(left + size * .2, top + size * .2, size * .6, size * .6);
                context.fillStyle = 'rgba(128, 233, 255, .9)';
                context.font = `700 ${Math.max(9, size * .22)}px monospace`;
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText('AI', x, y);
                const pulseY = top + size * (.2 + ((seconds * .7) % .6));
                context.beginPath();
                context.arc(left + size * .13, pulseY, 2, 0, Math.PI * 2);
                context.fillStyle = 'rgba(255, 184, 23, .95)';
                context.fill();
                context.restore();
            };

            const drawCodePanel = (x, y, scale, seconds) => {
                const panelWidth = scale * 142;
                const panelHeight = scale * 76;
                const left = x - panelWidth / 2;
                const top = y - panelHeight / 2;
                context.save();
                context.globalAlpha = .2;
                context.fillStyle = 'rgba(4, 27, 66, .72)';
                context.fillRect(left, top, panelWidth, panelHeight);
                context.strokeStyle = 'rgba(79, 205, 255, .65)';
                context.lineWidth = 1;
                context.strokeRect(left, top, panelWidth, panelHeight);
                context.fillStyle = 'rgba(255, 184, 23, .9)';
                context.beginPath();
                context.arc(left + 9 * scale, top + 9 * scale, 2 * scale, 0, Math.PI * 2);
                context.fill();
                context.font = `${Math.max(7, scale * 8)}px monospace`;
                context.textAlign = 'left';
                context.textBaseline = 'middle';
                const lines = ['<ptk.init />', 'let robot = 01;', 'data -> future'];
                lines.forEach((line, index) => {
                    const yLine = top + scale * (27 + index * 17);
                    const offset = (seconds * 13 + index * 19) % (panelWidth * .28);
                    context.fillStyle = index === 1 ? 'rgba(255, 184, 23, .9)' : 'rgba(147, 234, 255, .95)';
                    context.fillText(line, left + 10 * scale - offset * .1, yLine, panelWidth - 14 * scale);
                    context.fillStyle = 'rgba(84, 220, 255, .65)';
                    context.fillRect(left + panelWidth * .78, yLine + scale * 5, panelWidth * .12, scale);
                });
                const scanX = left + ((seconds * 34) % panelWidth);
                context.fillStyle = 'rgba(104, 232, 255, .18)';
                context.fillRect(scanX, top, scale * 2, panelHeight);
                context.restore();
            };

            const drawCircuit = (points, phase, seconds) => {
                let totalLength = 0;
                const lengths = [];
                for (let i = 1; i < points.length; i += 1) {
                    const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
                    lengths.push(length);
                    totalLength += length;
                }

                context.save();
                context.globalAlpha = .28;
                context.strokeStyle = 'rgba(62, 200, 255, .72)';
                context.lineWidth = 1.2;
                context.beginPath();
                context.moveTo(points[0][0], points[0][1]);
                points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
                context.stroke();
                points.forEach(([x, y], index) => {
                    if (index === 0 || index === points.length - 1) {
                        context.beginPath();
                        context.arc(x, y, 3, 0, Math.PI * 2);
                        context.stroke();
                    }
                });

                let distance = ((seconds * .34 + phase) % 1) * totalLength;
                for (let i = 0; i < lengths.length; i += 1) {
                    if (distance <= lengths[i]) {
                        const progress = distance / lengths[i];
                        const x = points[i][0] + (points[i + 1][0] - points[i][0]) * progress;
                        const y = points[i][1] + (points[i + 1][1] - points[i][1]) * progress;
                        context.beginPath();
                        context.arc(x, y, 3.2, 0, Math.PI * 2);
                        context.fillStyle = 'rgba(148, 243, 255, .95)';
                        context.shadowColor = 'rgba(0, 210, 255, .95)';
                        context.shadowBlur = 10;
                        context.fill();
                        break;
                    }
                    distance -= lengths[i];
                }
                context.restore();
            };

            const draw = (time, still = false) => {
                context.clearRect(0, 0, width, height);

                const glow = context.createRadialGradient(width * .78, height * .32, 0, width * .78, height * .32, Math.max(width, height) * .75);
                glow.addColorStop(0, 'rgba(0, 210, 255, .12)');
                glow.addColorStop(.55, 'rgba(0, 110, 220, .045)');
                glow.addColorStop(1, 'rgba(0, 58, 121, 0)');
                context.fillStyle = glow;
                context.fillRect(0, 0, width, height);

                const seconds = time * .001;
                const centerX = width * .78;
                const centerY = height * .48;
                const orbitRadius = Math.min(width, height) * .34 + 70;

                context.save();
                context.translate(centerX, centerY);
                context.rotate(seconds * .035);
                [orbitRadius, orbitRadius * .72, orbitRadius * 1.28].forEach((radius, index) => {
                    context.beginPath();
                    context.ellipse(0, 0, radius, radius * (.57 + index * .09), seconds * .04 + index * .7, index * .8, Math.PI * (1.3 + index * .2));
                    context.strokeStyle = index === 1 ? 'rgba(0, 220, 255, .22)' : 'rgba(255, 184, 23, .12)';
                    context.lineWidth = index === 1 ? 1.2 : 1;
                    context.stroke();
                });
                context.restore();

                for (let wave = 0; wave < 3; wave += 1) {
                    context.beginPath();
                    for (let x = 0; x <= width; x += 16) {
                        const y = height * (.72 + wave * .095)
                            + Math.sin(x * .008 + seconds * (.38 + wave * .08) + wave) * (12 + wave * 5)
                            + Math.sin(x * .017 - seconds * .22 + wave) * 5;
                        if (x === 0) context.moveTo(x, y);
                        else context.lineTo(x, y);
                    }
                    context.strokeStyle = `rgba(0, ${wave === 1 ? 220 : 150}, 255, ${.1 - wave * .02})`;
                    context.lineWidth = wave === 1 ? 1.4 : 1;
                    context.stroke();
                }

                const motifScale = Math.max(.58, Math.min(1, width / 1180));
                const gearRadius = Math.max(20, Math.min(50, width * .042));
                context.save();
                context.globalAlpha = .52;
                drawGear(width * .77, height * .86, gearRadius, 18, seconds * .72, 'rgba(88, 218, 255, .8)');
                drawGear(width * .77 + gearRadius * 1.63, height * .86, gearRadius * .68, 12, -seconds * 1.08, 'rgba(255, 184, 23, .65)');
                drawGear(width * .81, height * .17, gearRadius * .43, 12, -seconds * .82, 'rgba(104, 226, 255, .58)');
                drawGear(width * .81 + gearRadius * .72, height * .17, gearRadius * .3, 10, seconds * 1.18, 'rgba(255, 184, 23, .5)');
                context.restore();

                drawRobotArm(seconds, motifScale * 104);
                drawDrone(seconds, motifScale * 48);
                drawChip(width * .96, height * .69, motifScale * 62, seconds);
                drawCodePanel(width * .72, height * .13, motifScale, seconds);
                drawPiston(width * .58, height * .91, motifScale * 105, 0, seconds);
                drawPiston(width * .68, height * .96, motifScale * 88, 1.3, seconds);
                drawCircuit([
                    [width * .49, height * .84],
                    [width * .57, height * .84],
                    [width * .61, height * .79],
                    [width * .72, height * .79],
                    [width * .76, height * .74],
                    [width * .84, height * .74]
                ], 0, seconds);
                drawCircuit([
                    [width * .66, height * .94],
                    [width * .74, height * .94],
                    [width * .78, height * .89],
                    [width * .91, height * .89],
                    [width * .95, height * .84]
                ], .45, seconds);
                context.save();
                context.globalAlpha = .2;
                context.font = '12px monospace';
                context.fillStyle = 'rgba(139, 231, 255, .8)';
                context.textAlign = 'right';
                for (let bit = 0; bit < 9; bit += 1) {
                    const y = ((bit * 37 + seconds * 24) % height);
                    context.fillText(bit % 2 ? '01' : '10', width - 12, y);
                }
                context.restore();

                if (!still) {
                    const delta = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
                    lastTime = time;
                    particles.forEach((particle) => {
                        particle.x += particle.vx * delta;
                        particle.y += particle.vy * delta + Math.sin(seconds + particle.phase) * .08;

                        if (pointer.active) {
                            const dx = particle.x - pointer.x;
                            const dy = particle.y - pointer.y;
                            const distance = Math.hypot(dx, dy);
                            if (distance > 0 && distance < 125) {
                                const force = (125 - distance) / 125 * .012;
                                particle.vx += dx / distance * force;
                                particle.vy += dy / distance * force;
                            }
                        }

                        particle.vx = Math.max(-.55, Math.min(.55, particle.vx * .999));
                        particle.vy = Math.max(-.55, Math.min(.55, particle.vy * .999));
                        if (particle.x < -5) particle.x = width + 5;
                        if (particle.x > width + 5) particle.x = -5;
                        if (particle.y < -5) particle.y = height + 5;
                        if (particle.y > height + 5) particle.y = -5;
                    });
                }

                const connectionRadius = width < 600 ? 92 : 125;
                for (let i = 0; i < particles.length; i += 1) {
                    const particle = particles[i];
                    for (let j = i + 1; j < particles.length; j += 1) {
                        const other = particles[j];
                        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
                        if (distance < connectionRadius) {
                            context.beginPath();
                            context.moveTo(particle.x, particle.y);
                            context.lineTo(other.x, other.y);
                            context.strokeStyle = `rgba(103, 220, 255, ${(1 - distance / connectionRadius) * .23})`;
                            context.lineWidth = .7;
                            context.stroke();
                        }
                    }

                    const twinkle = .55 + Math.sin(seconds * 1.5 + particle.phase) * .25;
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.radius * (1 + twinkle * .25), 0, Math.PI * 2);
                    context.fillStyle = `rgba(173, 239, 255, ${particle.brightness * twinkle})`;
                    context.shadowColor = 'rgba(0, 210, 255, .85)';
                    context.shadowBlur = particle.radius > 1.7 ? 9 : 4;
                    context.fill();
                }
                context.shadowBlur = 0;

            };

            const animate = (time) => {
                frame = 0;
                draw(time);
                if (visible && !document.hidden && !reducedMotion.matches) {
                    frame = window.requestAnimationFrame(animate);
                }
            };
            const start = () => {
                if (visible && !document.hidden && !reducedMotion.matches && !frame) {
                    lastTime = 0;
                    frame = window.requestAnimationFrame(animate);
                }
            };
            const stop = () => {
                if (frame) {
                    window.cancelAnimationFrame(frame);
                    frame = 0;
                }
            };

            const observer = new IntersectionObserver((entries) => {
                visible = entries[0].isIntersecting;
                if (visible) start();
                else stop();
            });
            observer.observe(hero);
            window.addEventListener('resize', resize, { passive: true });
            const resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(hero);
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) stop();
                else start();
            });
            hero.addEventListener('pointermove', (event) => {
                const bounds = canvas.getBoundingClientRect();
                pointer.x = event.clientX - bounds.left;
                pointer.y = event.clientY - bounds.top;
                pointer.active = true;
            }, { passive: true });
            hero.addEventListener('pointerleave', () => {
                pointer.active = false;
            }, { passive: true });
            const handleMotionChange = () => {
                stop();
                if (reducedMotion.matches) draw(0, true);
                else start();
            };
            if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', handleMotionChange);
            else reducedMotion.addListener(handleMotionChange);
            resize();
            start();
        }
    }
});
