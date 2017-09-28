class Rect {
    // 생성자 기본값 대입
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class GameObject {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.collisionRect = new Rect();
    }
}

class Sprite extends GameObject {
    constructor(game, sourceImageRect) {
        super();
        this.game = game;
        this.imageRect = sourceImageRect;
    }

    render() {
        let { x, y, width, height} = this.imageRect;

        this.game.context.drawImage(this.game.image,
            x, y, width, height,
            this.x, this.y, width, height);
    }
}

class Animation extends Sprite {
    constructor(game, sourceImageRect, totalFrame, fps) {
        super(game, sourceImageRect);

        this.frames = [];
        this.currentFrame = 0;
        this.totalFrame = totalFrame;
        this.fps = fps;

        //스프라이트 시트 상에서 항상 옆으로 이어져있으니 야매로
        for(let i = 0; i < this.totalFrame; i++) {
          this.frames[i] = new Rect(
            sourceImageRect.x + i * sourceImageRect.width,
            sourceImageRect.y,
            sourceImageRect.width,
            sourceImageRect.height
          );
        }
    }
    update(deltaTime) {
      this.currentFrame += deltaTime * this.fps;

      let frameToRender = Math.floor(this.currentFrame);

      if (frameToRender >= this.totalFrame) {
        this.currentFrame = frameToRender = 0;
      }
      this.imageRect = this.frames[frameToRender];
    }
}

class Horizon {
    constructor(game) {
        this.clouds = [];
        this.game = game;
        this.cloudSpawnTimer = 0;

        const { x, y, width, height } =
            TRexGame.spriteDefinition.HORIZON;

        this.sourcexPositions = [x, x + width];
        this.xPositions = [0, width];
        this.yPosition = this.game.canvas.height - height;

        this.addCloud();
    }

    render() {
        // 수평선
        let { x, y, width, height}
            = TRexGame.spriteDefinition.HORIZON;

        for (let i = 0; i  < this.xPositions.length; ++i) {
            this.game.context.drawImage(this.game.image,
                this.sourcexPositions[i], y, width, height,
                this.xPositions[i], this.yPosition, width, height);
        }

        // 구름
        for (let c of this.clouds) {
            c.render();
        }
    }

    update(deltaTime) {
        // 수평선
        for (let i = 0; i < this.xPositions.length; ++i) {
            this.xPositions[i] -= this.game.speed * deltaTime;
            if (this.xPositions[i] <= -this.game.canvas.width) {
                this.xPositions[i] += this.game.canvas.width * 2;
            }
        }

        // 구름
        this.cloudSpawnTimer += deltaTime;

        if (this.cloudSpawnTimer > TRexGame.config.CLOUD_SPAWN_DURATION) {
            this.cloudSpawnTimer = 0;
            this.addCloud();
        }

        for (let c of this.clouds) {
            c.update(deltaTime);
        }
    }



    addCloud() {
        const c = new Cloud(this.game);
        this.clouds.push(c);

        c.x = 600;
        c.y = Math.random() * 30 + 30;
    }
}

class Cloud extends Sprite {
    constructor(game) {
        super(game, TRexGame.spriteDefinition.CLOUD);

    }

    update(deltaTime) {
        this.x -= this.game.speed * deltaTime
         * TRexGame.config.CLOUD_SPEED_MULTIPLIER;
    }


}

class Player extends GameObject {
    constructor(game) {
        super();
        this.game = game;
        this.normal = new Animation(game,
        TRexGame.spriteDefinition.TREX, 2, 12);
        this.duck = new Animation(game,
        TRexGame.spriteDefinition.TREX_DUCK, 2, 12);
        this.animation = this.normal;
        this.groundY = this.game.canvas.height - this.animation.imageRect.height;
        this.velocity = 0;
        this.jumping = false;
        this.ducking = false
    }

    render() {
      this.animation.x = this.x;
      this.animation.y = this.y;
      this.animation.render();
    }

    update(deltaTime) {
      this.animation.update(deltaTime);

      if(this.game.isKeyDown('Space') && !this.ducking) {
        this.jump();
      }
      if(this.game.isKeyDown('ArrowDown')) {
        if(this.jumping) {
          // 빨리 내려가기
        } else {
          this.startDuck();
        }
      } else if(this.ducking) {
        this.endDuck();
      }
      this.velocity += TRexGame.config.GRAVITY;
      this.y += this.velocity;
      if (this.y >= this.groundY) {
        this.y = this. groundY;
        this.jumping = false;
        this.velocity = 0;
      }
    }
      jump() {
        if (!this.jumping) {
          this.jumping = true;
          this.velocity = TRexGame.config.JUMP_VELOCITY;
        }
      }
      startDuck() {
        this.ducking = true;
        this.animation = this.duck;
      }
      endDuck() {
        this.ducking = false;
        this.animation = this.normal;
      }
}


class TRexGame {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.context = canvasElement.getContext('2d');

        this.canvas.width = 600;
        this.canvas.height = 150;
        this.speed = TRexGame.config.SPEED;
        this.image = new Image();
        this.image.src = 'Resources/100-offline-sprite.png';
        this.player = new Player(this);
        this.player.x = 50;
        this.horizon = new Horizon(this);
        this.downKeys = {};
        this.obstacles = [];
        window.addEventListener('blur', this.onVisibilityChange.bind(this));
        window.addEventListener('focus', this.onVisibilityChange.bind(this));
        document.addEventListener('visibilityChange', this.onVisibilityChange.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    pause() {
      this.paused = true;
    }

    play() {
        this.paused = false;
        this.time = performance.now();
        this.scheduleNextUpdate();
    }

    render() {
    }

    update() {
        const now = performance.now();
        const deltaTime = (now - (this.time || now)) / 1000;
        this.time = now;

        this.clearCanvas();

        this.horizon.update(deltaTime);
        this.horizon.render();  // 임시
        this.player.update(deltaTime);
        this.player.render();
        this.scheduleNextUpdate();
    }

    scheduleNextUpdate() {
        if (!this.paused) {
          this.reqId = requestAnimationFrame(this.update.bind(this));
        }
        //cancelAnimationFrame(raqId);
    }

    clearCanvas() {
        this.context.clearRect(
            0, 0, this.canvas.width, this.canvas.height);
    }
    onVisibilityChange(event) {
      if (document.hidden || event.type === 'blur' || document.visibilityState !== 'visible') {
        this.pause();
      } else {
        this.play();
      }
    }
    onKeyDown(event) {
      this.downKeys[event.code] = true;
    }
    onKeyUp(event) {
      this.downKeys[event.code] = false;
    }
    isKeyDown(code) {
      return this.downKeys[code];
    }
}

TRexGame.spriteDefinition = {
    CACTUS_LARGE: { x: 332, y: 2 },
    CACTUS_SMALL: { x: 228, y: 2 },
    CLOUD: new Rect(86, 2, 46, 14),
    HORIZON: new Rect(2, 54, 600, 16),
    MOON: { x: 484, y: 2 },
    BIRD: { x: 134, y: 2 },
    RESTART: { x: 2, y: 2 },
    TEXT_SPRITE: { x: 655, y: 2 },
    TREX: new Rect(936, 2, 44, 47),
    TREX_DUCK: new Rect(1112, 2, 59, 47),
    STAR: { x: 645, y: 2 }
};

TRexGame.config = {
    SPEED: 300,
    GRAVITY: 0.6,
    JUMP_VELOCITY: -10,
    CLOUD_SPAWN_DURATION: 5,
    CLOUD_SPEED_MULTIPLIER: 0.2
}

// 이 코드만으로 게임이 실행
let gameCanvas = document.getElementById('game');
let game = new TRexGame(gameCanvas);
game.play();
