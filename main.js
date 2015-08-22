/**
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
window.requestAnimFrame = ( function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function ( /*function */callback, /* DOMElement*/element ) {
            window.setTimeout( callback, 1000 / 60 );
        };
} ) ();

/**
 * Method to remove an item from an array
 */
function arrayRemove ( array, from ) {
    var rest = array.slice( ( from ) + 1 || array.length );
    array.length = from < 0 ? array.length + from : from;

    return array.push.apply( array, rest );
}

var game = ( function () {

    // Global vars
    var canvas, ctx, buffer, bufferctx,
        background,
        bgSpeed = 10,
        shots = [],
        shotsGroup,
        particleManager,
        player,
        buggers = [],
        buggersGroup,
        buggerMode = false,
        score = 0,
        keyPressed = {},
        keyMap = {
            left: 37,
            up: 38,
            right: 39,
            down: 40,
            fire: 88,           // X
            fire2: 67,          // C
            speedUp: 34,        // Av Pag
            speedDown: 33,      // Re Pag
            spaceBar: 32,       // Space (prevent screen jump)
            buggerMode: 49,     // 1 key
            clearEnemies: 48    // 0 key
        };


    /**
     * Init vars, load assets and start the main animation.
     */
    function init () {
        // Canvas & Buffering
        canvas = document.getElementById( 'canvas' );
        ctx = canvas.getContext( '2d' );
        buffer = document.createElement( 'canvas' );
        bufferctx = buffer.getContext( '2d' );

        resizeCanvas();

        // Create Game Elements
        particleManager = new ParticleManager(bufferctx);
        background = new BackgroundSystem();
        player = new Player();
        shotsGroup = shotsManagement();
        buggersGroup = buggersManagement();

        // Listeners: keyboard control and resize
        addListener( document, 'keydown', keyDown );
        addListener( document, 'keyup', keyUp );
        addListener( window, 'resize', resizeCanvas );


        // Gameloop
        var anim = function () {
            update();
            window.requestAnimFrame( anim );
        };

        anim();
    }


    /**
     * Method to resize the canvas to a percentage of the full screen
     */
    function resizeCanvas () {
        canvas.width = window.innerWidth * 0.85; // 85%
        canvas.height = window.innerHeight * 0.85;
        buffer.width = canvas.width;
        buffer.height = canvas.height;
    }


    /**
     * Background System Manager
     */
    function BackgroundSystem () {
        var background1, background2, backgroundLayers;

        background1 = new Image();
        background1.src = 'images/background-1.jpg';
        background1.posX = 0;

        background2 = new Image();
        background2.src = 'images/background-2.jpg';

        background1.addEventListener('load', function() {
            background2.posX = background1.width;
        });

        backgroundLayers = [ background1, background2 ];

        return {
            scroll: function () {
                var self = this;
                backgroundLayers.forEach( function ( layer ) {
                    layer.posX = ( layer.posX <= - layer.width ) ?
                        layer.width - ( bgSpeed * 2 ) :
                        layer.posX - bgSpeed;

                    self.render( layer );
                } );
            },
            getHeight: function () {
                return background1.height;
            },
            getWidth: function () {
                return background1.width;
            },
            render: function ( layer ) {
                bufferctx.drawImage( layer, layer.posX, 0 );
            }
        };
    }


    /**
     * Player object
     */
    function Player ( player ) {
        /**
         * Properties
         */
        player = new Image();
        player.src = 'images/ship.png';
        player.posX = player.width;
        player.posY = 120;//( background.getHeight() / 2 ) - ( player.height / 2 );
        player.speed = 3;
        player.weapon = {
           speed: 10,
           spacing: 1
        };

        // Properties / flags
        player.bombing = false;

        /**
         * Methods
         */
        player.render = function () {
            renderImage( player, bufferctx, player.posX, player.posY );
        };

        player.updatePos = {
            up: function (){
                player.posY -= player.speed;
            },
            down: function () {
                player.posY += player.speed;
            },
            left: function () {
                player.posX -= player.speed;
            },
            right: function () {
                player.posX += player.speed;
            }
        };

        player.fire = function () {
            if (
                shots &&
                ( shots.length > 1 ) &&
                ( shots[ shots.length - 1 ].posX < ( player.posX + player.width + player.weapon.spacing ) )
            ) {
                return false;
            }

            var shot = new Shot( {
                shot: this,
                direction: player.posY,
                shotX: player.posX + ( player.width / 2 ) + 10,
                shotY: player.posY - 7,
                speed: player.weapon.speed
            } );

            shot.addToScreen();
        };

        player.throwBomb = function () {
            if ( player.bombing ) {
                return;
            }

            player.bombing = true;

            // BOMB -- Explosion with particle manager
            particleManager.createExplosion( 0, 0, 130, 15, 70, 3, 0 );
            particleManager.createExplosion( canvas.width, 0, 130, 15, 70, 3, 0 );
            particleManager.createExplosion( 0, background.getHeight(), 130, 15, 70, 3, 0 );
            particleManager.createExplosion( canvas.width, background.getHeight(), 130, 15, 70, 3, 0 );
            particleManager.createExplosion( canvas.width / 2, background.getHeight() / 2, 100, 10, 70, 3, 0, function () {
                setTimeout( function () { player.bombing = false; }, 1500 );
            } );

            buggersManagement().destroyBuggers();
        };

        return player;
    }


    /**
     * Bullet object
     */
    function Shot ( args ) {
        /**
         * Properties
         */
        shot = new Image();
        shot.src = 'images/shot.png'; //12x12
        shot.posX = args.shotX;
        shot.posY = args.shotY;

        /**
         * Methods
         */
        shot.render = function () {
            bufferctx.drawImage( this, this.posX, this.posY );
        };

        shot.updatePos = function () {
            this.posX += player.weapon.speed;
        };

        shot.checkOffScreen = function () {
            if ( this.posX > canvas.width ) {
                this.removeFromScreen();
            }
        };

        shot.addToScreen = function () {
            shots.push( this );
        };

        shot.removeFromScreen = function ( id ) {
            shots.shift();
        };

        return shot;
    }


    /**
     * Enemies object
     */
    function Bugger ( bugger ) {
        /**
         * Properties
         */
        bugger = new Image();
        bugger.src = 'images/bugger.png';
        bugger.initPos = ( Math.random() * ( background.getHeight() - 120 ) ) + 60;
        bugger.posX = canvas.width + ( Math.random() * ( canvas.width / 2 ) ) + 1;
        bugger.posY = bugger.initPos;
        bugger.speed = 5;

        /**
         * Methods
         */
        bugger.render = function () {
            bufferctx.drawImage( bugger, bugger.posX, bugger.posY );
        };

        bugger.updatePos = function () {
            bugger.posX -= bugger.speed;
            bugger.posY -= 3 * Math.sin( bugger.initPos * Math.PI / 64 );
            bugger.initPos++;

            if ( bugger.posY < 0 ) { bugger.posY = 0; }
            if ( bugger.posY > background.getHeight() - 100 ) { bugger.posY = background.getHeight() - 100; }
        };

        bugger.checkOffScreen = function () {
            if ( bugger.posX < 0 || bugger.posX > canvas.width ) {
                bugger.removeFromScreen( parseInt( bugger.id, 10 ) );
            }
        };

        bugger.addToScreen = function () {
            buggers.push( bugger );
        };

        bugger.removeFromScreen = function ( id ) {
            arrayRemove( buggers, id );
        };

        return bugger;
    }


    /**
     * Manages the particles for the explosions
     */
    function ParticleManager ( n ) {
        var fireParticle,
            t = [],
            i = n;

        fireParticle = new Image();
        fireParticle.src = 'images/fire.png';

        this.particle = function ( n, t, i, r, u, f, e ) {
            var s = Math.floor( Math.random() * 360 ),
                o = s * Math.PI / 180;
            return {
                x: n,
                y: t,
                width: i,
                height: r,
                speed: u,
                life: e,
                gravity: f,
                xunits: Math.cos( o ) * u,
                yunits: Math.sin( o ) * u,
                moves: 0
            };
        };

        this.draw = function () {
            for ( var r = [], n = t.length - 1; n >= 0; n-- ) {
                t[ n ].moves++;
                t[ n ].x += t[ n ].xunits;
                t[ n ].y += t[ n ].yunits + t[ n ].gravity * t[ n ].moves;
                if ( t[ n ].moves < t[ n ].life ) {
                    r.push( t[ n ] );
                    i.globalAlpha = 5 / t[ n ].moves;
                    i.drawImage( fireParticle, Math.floor( t[ n ].x ), Math.floor( t[ n ].y ), t[ n ].width, t[ n ].height );
                    i.globalAlpha = 1;
                }
            }
            t = r;
        };

        this.createExplosion = function ( n, i, r, u, f, e, o, fn ) {
            var s, h;
            for ( n = n - r * 0.5, i = i - r * 0.5, e = r * e * 0.01, s = 1; s < u; s++ ) {
                for ( h = 0; h < 10 * s; h++ ) {
                    t.push( this.particle( n, i, r, r, s * e, o, f ) );
                }
            }

            if ( fn ) { fn(); }
        };
    }


    /**
     * Shots Management
     */
    function shotsManagement () {
        return {
            updateShots: function () {
                if ( shots.length > 0 ) {
                    shots.forEach( function ( _shot, index ) {
                        _shot.updatePos();
                        _shot.render();
                        _shot.checkOffScreen();
                    } );
                }
            }
        };
    }


    /**
     * Buggers Management
     */
    function buggersManagement () {
        return {
            buggersCount: 20,
            updateBuggers: function () {
                if ( buggerMode && buggers.length > 0 ) {
                    buggers.forEach( function ( bugger, index ) {
                        bugger.id = index;
                        bugger.updatePos();
                        bugger.checkOffScreen();
                        bugger.render();
                    } );
                }
                if ( buggerMode && player.bombing === false ) {
                    this.createBuggers();
                }
            },
            createBuggers: function () {
                var b = null;
                for ( var i = 0, n = this.buggersCount - buggers.length; i < n; i++ ) {
                    b = new Bugger();
                    b.addToScreen();
                }
            },
            destroyBuggers: function () {
                buggers.forEach( function ( bugger, index ) {
                    bugger = null;
                } );
                buggers.length = 0;
            }
        };
    }


    /**
     * Prints some help on screen
     */
    function printHUD () {
        // Score
        bufferctx.font = 'italic 25px arial';
        bufferctx.fillStyle = '#fff';
        bufferctx.fillText( 'Score: ' + score, 50, 50 );

        // Help

        bufferctx.font = 'italic 15px arial';
        bufferctx.fillText( '[Arrows] -> Move', 10, canvas.height - 90 );
        bufferctx.fillText( '[1] -> Buggers Mode', 10, canvas.height - 50 );
        bufferctx.fillText( '[X] -> Shoot', 10, canvas.height - 30 );
        bufferctx.fillText( '[C] -> Bombs', 10, canvas.height - 10 );
        bufferctx.fillText( '[Av Pag] -> Speed up', 250, canvas.height - 50 );
        bufferctx.fillText( '[Re Pag] -> Speed down', 250, canvas.height - 30 );
        bufferctx.fillText( '[0] -> Clear enemies', 250, canvas.height - 10 );
    }


    /**
     * Method to render and rotate an image
     */
    function renderImage ( image, ctxTmp, x, y ) {
        ctxTmp.save();
        ctxTmp.translate( x, y );
        ctxTmp.drawImage( image, - ( image.width / 2 ), - ( image.height / 2 ) );
        ctxTmp.restore();
    }


    /**
     * Launch several actions depending on the key pressed
     */
    function listenGameActionEvents () {
        if ( keyPressed.spaceBar ) {
            return false;
        }

        if ( keyPressed.up && player.posY > ( player.height / 2 ) ) {
            player.updatePos.up();
        }

        if ( keyPressed.down && player.posY < ( canvas.height - player.height / 2 ) &&
                player.posY < background.getHeight() ) {
            player.updatePos.down();
        }

        if ( keyPressed.left && player.posX > ( player.width / 2 ) ) {
            player.updatePos.left();
        }

        if ( keyPressed.right && player.posX < ( canvas.width - player.width / 2 ) ) {
            player.updatePos.right();
        }

        if ( keyPressed.fire ) {
            player.fire();
        }

        if ( keyPressed.fire2 ) {
            player.throwBomb();
        }

        if ( keyPressed.speedUp && bgSpeed < 30 ) {
            bgSpeed += 2;
        }

        if ( keyPressed.speedDown && bgSpeed >= 10 ) {
            bgSpeed -= 2;
        }

        if ( keyPressed.buggerMode ) {
            if ( ! buggerMode ) {
                buggerMode = true;
                buggersManagement().createBuggers();
            }
        }

        if ( keyPressed.clearEnemies ) {
            if ( buggerMode ) {
                buggerMode = false;
                buggersManagement().destroyBuggers();
            }
        }
    }


    /**
     * CrossBrowser implementation for a Event Listener
     */
    function addListener ( element, type, expression, bubbling ) {
        bubbling = bubbling || false;

        if ( window.addEventListener ) { // Standard
            element.addEventListener( type, expression, bubbling );
        } else if ( window.attachEvent ) { // IE
            element.attachEvent( 'on' + type, expression );
        } else {
            return false;
        }
    }


    /**
     * Handle keyDown
     */
    function keyDown ( e ) {
        var key = ( window.event ? e.keyCode : e.which );
        for ( var inkey in keyMap ) {
            if ( key === keyMap[ inkey ] ) {
                e.preventDefault();
                keyPressed[ inkey ] = true;
            }
        }
    }


    /**
     * Handle keyUp
     */
    function keyUp ( e ) {
        var key = ( window.event ? e.keyCode : e.which );
        for ( var inkey in keyMap ) {
            if ( key === keyMap[ inkey ] ) {
                e.preventDefault();
                keyPressed[ inkey ] = false;
            }
        }
    }


    /**
     * Draw the buffer into the context
     */
    function draw () {
        ctx.drawImage( buffer, 0, 0 );
    }


    /**
     * Update the main game scene
     */
    function update () {
        // Update positions for background, shots and buggers if necessary

        //Limpiar el canvas para que no deje estela cuando se mueve
        canvas.width = canvas.width;
        buffer.width = buffer.width;

        background.scroll();
        shotsGroup.updateShots();
        buggersGroup.updateBuggers();
        player.render();
        particleManager.draw();
        printHUD();

        listenGameActionEvents();
        draw();
    }


    // Public Methods
    return {
        init: init
    };

} ) ();