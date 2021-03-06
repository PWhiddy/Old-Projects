/// @file JSRoot3DPainter.js
/// JavaScript ROOT 3D graphics

(function( factory ) {
   if ( typeof define === "function" && define.amd ) {
      // AMD. Register as an anonymous module.
      define( ['d3', 'JSRootPainter', 'threejs_all'], factory );
   } else {

      if (typeof JSROOT == 'undefined')
         throw new Error('JSROOT is not defined', 'JSRoot3DPainter.js');

      if (typeof d3 != 'object')
         throw new Error('This extension requires d3.v3.js', 'JSRoot3DPainter.js');

      if (typeof JSROOT.Painter != 'object')
         throw new Error('JSROOT.Painter is not defined', 'JSRoot3DPainter.js');

      if (typeof THREE == 'undefined')
         throw new Error('THREE is not defined', 'JSRoot3DPainter.js');

      factory(d3, JSROOT);
   }
} (function(d3, JSROOT) {

   JSROOT.Painter.TestWebGL = function() {
      // return true if WebGL should be used
      /**
       * @author alteredq / http://alteredqualia.com/
       * @author mr.doob / http://mrdoob.com/
       */

      if (JSROOT.gStyle.NoWebGL) return false;

      if ('_Detect_WebGL' in this) return this._Detect_WebGL;

      try {
         var canvas = document.createElement( 'canvas' );
         this._Detect_WebGL = !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
         //res = !!window.WebGLRenderingContext &&  !!document.createElement('canvas').getContext('experimental-webgl');
       } catch (e) {
           return false;
       }

       return this._Detect_WebGL;
   }

   JSROOT.Painter.add3DInteraction = function() {
      // add 3D mouse interactive functions

      var painter = this;
      var mouseX, mouseY, distXY = 0, mouseDowned = false;
      var INTERSECTED = null;

      var tooltip = {
         tt: null, cont: null,
         pos : function(e) {
            if (this.tt === null) return;
            var u = JSROOT.browser.isIE ? (event.clientY + document.documentElement.scrollTop) : e.pageY;
            var l = JSROOT.browser.isIE ? (event.clientX + document.documentElement.scrollLeft) : e.pageX;

            this.tt.style.top = (u + 15) + 'px';
            this.tt.style.left = (l + 3) + 'px';
         },
         show : function(v) {
            if (JSROOT.gStyle.Tooltip <= 0) return;
            if (this.tt === null) {
               this.tt = document.createElement('div');
               this.tt.setAttribute('class', 'jsroot');
               var t = document.createElement('div');
               t.setAttribute('class', 'tt3d_border');
               this.cont = document.createElement('div');
               this.cont.setAttribute('class', 'tt3d_cont');
               var b = document.createElement('div');
               b.setAttribute('class', 'tt3d_border');
               this.tt.appendChild(t);
               this.tt.appendChild(this.cont);
               this.tt.appendChild(b);
               document.body.appendChild(this.tt);
               this.tt.style.opacity = 1;
               this.tt.style.filter = 'alpha(opacity=1)';
               this.tt.style.position = 'absolute';
               this.tt.style.display = 'block';
            }
            this.cont.innerHTML = v;
            this.tt.style.width = 'auto'; // let it be automatically resizing...
            if (JSROOT.browser.isIE)
               this.tt.style.width = this.tt.offsetWidth;
         },
         hide : function() {
            if (this.tt !== null)
               document.body.removeChild(this.tt);
            this.tt = null;
         }
      };

      var raycaster = new THREE.Raycaster();
      var do_bins_highlight = painter.first_render_tm < 2000;

      function findIntersection(mouse) {
         // find intersections

         if (JSROOT.gStyle.Tooltip <= 0) return tooltip.hide();

         raycaster.setFromCamera( mouse, painter.camera );
         var intersects = raycaster.intersectObjects(painter.scene.children, true);
         if (intersects.length > 0) {
            var pick = null;
            for (var i = 0; i < intersects.length; ++i) {
               if (('name' in intersects[i].object) && (intersects[i].object.name.length > 0)) {
                  pick = intersects[i].object;
                  break;
               }
            }
            if ((pick!==null) && (INTERSECTED !== pick)) {
               if (INTERSECTED && do_bins_highlight && ('emissive' in INTERSECTED.material)) {
                  INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
                  // 0.96 and 1.04166 are inverse, allowing "highlight" bins to buldge
                  // slightly and be visible over the unhighlighted ones 
                  INTERSECTED.scale.x *= 0.96;
                  INTERSECTED.scale.y *= 0.96;
                  INTERSECTED.scale.z *= 0.96;
                  INTERSECTED.material.visible = false;
               }

               INTERSECTED = pick;
               if (do_bins_highlight && ('emissive' in INTERSECTED.material)) {
                  INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
                  INTERSECTED.material.emissive.setHex(0x5f5f5f);
                  INTERSECTED.scale.x *= 1.04166666666666;
                  INTERSECTED.scale.y *= 1.04166666666666;
                  INTERSECTED.scale.z *= 1.04166666666666;
                  INTERSECTED.material.visible = true;
                  painter.Render3D(0);
               }

               tooltip.show(INTERSECTED.name, 200);
            }
         } else {
            if (INTERSECTED && do_bins_highlight && ('emissive' in INTERSECTED.material)) {
               INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
               INTERSECTED.scale.x *= 0.96;
               INTERSECTED.scale.y *= 0.96;
               INTERSECTED.scale.z *= 0.96;
               INTERSECTED.material.visible = false;
               painter.Render3D(0);
            }
            INTERSECTED = null;
            tooltip.hide();
         }
      };

      function coordinates(e) {
         if ('changedTouches' in e) return e.changedTouches;
         if ('touches' in e) return e.touches;
         return [e];
      }

      function mousedown(e) {
         tooltip.hide();
         e.preventDefault();

         var arr = coordinates(e);
         if (arr.length == 2) {
            distXY = Math.sqrt(Math.pow(arr[0].pageX - arr[1].pageX, 2) + Math.pow(arr[0].pageY - arr[1].pageY, 2));
         } else {
            mouseX = arr[0].pageX;
            mouseY = arr[0].pageY;
         }
         mouseDowned = true;

      }

      painter.renderer.domElement.addEventListener('touchstart', mousedown);
      painter.renderer.domElement.addEventListener('mousedown', mousedown);

      function mousemove(e) {
         var arr = coordinates(e);

         if (mouseDowned) {
            if (arr.length == 2) {
               var dist = Math.sqrt(Math.pow(arr[0].pageX - arr[1].pageX, 2) + Math.pow(arr[0].pageY - arr[1].pageY, 2));

               var delta = (dist-distXY)/(dist+distXY);
               distXY = dist;
               if (delta === 1.) return;

               painter.camera.position.x += delta * painter.size3d * 10;
               painter.camera.position.y += delta * painter.size3d * 10;
               painter.camera.position.z -= delta * painter.size3d * 10;
            } else {
               var moveX = arr[0].pageX - mouseX;
               var moveY = arr[0].pageY - mouseY;
               var length = painter.camera.position.length();
               var ddd = length > painter.size3d ? 0.001*length/painter.size3d : 0.01;
               // limited X rotate in -45 to 135 deg
               //if ((moveY > 0 && painter.toplevel.rotation.x < Math.PI * 3 / 4)
               //      || (moveY < 0 && painter.toplevel.rotation.x > -Math.PI / 4))
               //   painter.toplevel.rotation.x += moveX * 0.02;
               painter.toplevel.rotation.z += moveX * ddd;
               painter.toplevel.rotation.x += moveY * ddd;
               painter.toplevel.rotation.y -= moveY * ddd;
               mouseX = arr[0].pageX;
               mouseY = arr[0].pageY;
            }
            painter.Render3D(0);
         } else
         if (arr.length == 1) {
            var mouse_x = ('offsetX' in arr[0]) ? arr[0].offsetX : arr[0].layerX;
            var mouse_y = ('offsetY' in arr[0]) ? arr[0].offsetY : arr[0].layerY;
            mouse = { x: (mouse_x / painter.renderer.domElement.width) * 2 - 1,
                      y: -(mouse_y / painter.renderer.domElement.height) * 2 + 1 };
            findIntersection(mouse);
            tooltip.pos(arr[0]);
         } else {
            tooltip.hide();
         }

         e.stopPropagation();
         e.preventDefault();
      }

      painter.renderer.domElement.addEventListener('touchmove', mousemove);
      painter.renderer.domElement.addEventListener('mousemove', mousemove);

      function mouseup(e) {
         mouseDowned = false;
         tooltip.hide();
         distXY = 0;
      }

      painter.renderer.domElement.addEventListener('touchend', mouseup);
      painter.renderer.domElement.addEventListener('touchcancel', mouseup);
      painter.renderer.domElement.addEventListener('mouseup', mouseup);

      function mousewheel(event) {
         event.preventDefault();
         event.stopPropagation();

         var delta = 0;
         if ( event.wheelDelta ) {
            // WebKit / Opera / Explorer 9
            delta = event.wheelDelta / 400;
         } else if ( event.detail ) {
            // Firefox
            delta = - event.detail / 30;
         }
         painter.camera.position.x -= delta * painter.size3d;
         painter.camera.position.y -= delta * painter.size3d;
         painter.camera.position.z += delta * painter.size3d;
         painter.Render3D(0);
      }

      painter.renderer.domElement.addEventListener( 'mousewheel', mousewheel, false );
      painter.renderer.domElement.addEventListener( 'MozMousePixelScroll', mousewheel, false ); // firefox


      painter.renderer.domElement.addEventListener('mouseleave', function() {
         tooltip.hide();
      });


      painter.renderer.domElement.addEventListener('contextmenu', function(e) {
         e.preventDefault();
         tooltip.hide();

         painter.ShowContextMenu("hist", e);
      });

   }

   JSROOT.Painter.HPainter_Create3DScene = function(arg) {

      if ((arg!==null) && (arg<0)) {
         this.clear_3d_canvas();
         delete this.size3d;
         delete this.scene;
         delete this.toplevel;
         delete this.camera;
         delete this.renderer;
         if ('render_tmout' in this) {
            clearTimeout(this.render_tmout);
            delete this.render_tmout;
         }
         return;
      }

      if ('toplevel' in this) {
         // it is indication that all 3D object created, just replace it with empty

         var newtop = new THREE.Object3D();

         newtop.rotation.x = this.toplevel.rotation.x;
         newtop.rotation.y = this.toplevel.rotation.y;

         this.scene.remove(this.toplevel);

         this.scene.add(newtop);

         this.toplevel = newtop;

         return;
      }

      var size = this.size_for_3d();

      this.size3d = 100;

      // three.js 3D drawing
      this.scene = new THREE.Scene();
      //scene.fog = new THREE.Fog(0xffffff, 500, 3000);

      this.toplevel = new THREE.Object3D();
      //this.toplevel.rotation.x = 30 * Math.PI / 180;
      //this.toplevel.rotation.y = 30 * Math.PI / 180;
      this.scene.add(this.toplevel);
      this.scene_width = size.width;
      this.scene_height = size.height

      this.camera = new THREE.PerspectiveCamera(45, this.scene_width / this.scene_height, 1, 40*this.size3d);
      var pointLight = new THREE.PointLight(0xcfcfcf);
      this.camera.add( pointLight );
      pointLight.position.set( this.size3d / 10, this.size3d / 10, this.size3d / 10 );
      this.camera.position.set(-3*this.size3d, -3*this.size3d, 3*this.size3d);
      this.camera.up = new THREE.Vector3(0,0,1);
      this.camera.lookAt(new THREE.Vector3(0,0,this.size3d));
      this.scene.add( this.camera );

      var webgl = JSROOT.Painter.TestWebGL();

      this.renderer = webgl ? new THREE.WebGLRenderer({ antialias : true, alpha: true }) :
                              new THREE.CanvasRenderer({ antialias : true, alpha: true  });
      //renderer.setClearColor(0xffffff, 1);
      // renderer.setClearColor(0x0, 0);
      this.renderer.setSize(this.scene_width, this.scene_height);

      this.add_3d_canvas(size, this.renderer.domElement);

      this['DrawXYZ'] = JSROOT.Painter.HPainter_DrawXYZ;
      this['Render3D'] = JSROOT.Painter.Render3D;
      this['Resize3D'] = JSROOT.Painter.Resize3D;

      this.first_render_tm = 0;
   }

   JSROOT.Painter.HPainter_DrawXYZ = function() {

      var grminx = -this.size3d, grmaxx = this.size3d,
          grminy = -this.size3d, grmaxy = this.size3d,
          grminz = 0, grmaxz = 2*this.size3d,
          textsize = Math.round(this.size3d * 0.07),
          bothsides = (this.size3d !== 0),
          xmin = this.xmin, xmax = this.xmax,
          ymin = this.ymin, ymax = this.ymax,
          zmin = this.zmin, zmax = this.zmax,
          histo = this.histo;

      if (this.size3d === 0) {
         grminx = this.xmin; grmaxx = this.xmax;
         grminy = this.ymin; grmaxy = this.ymax;
         grminz = this.zmin; grmaxz = this.zmax;
         textsize = (grmaxz - grminz) * 0.05;
      }

      if (('zoom_xmin' in this) && ('zoom_xmax' in this) && (this.zoom_xmin !== this.zoom_xmax)) {
         xmin = this.zoom_xmin; xmax = this.zoom_xmax;
      }

      if (('zoom_ymin' in this) && ('zoom_ymax' in this) && (this.zoom_ymin !== this.zoom_ymax)) {
         ymin = this.zoom_ymin; ymax = this.zoom_ymax;
      }

      if (('zoom_zmin' in this) && ('zoom_zmax' in this) && (this.zoom_zmin !== this.zoom_zmax)) {
         zmin = this.zoom_zmin; zmax = this.zoom_zmax;
      }

      if (this.options.Logx) {
         if (xmax <= 0) xmax = 1.;
         if ((xmin <= 0) && (this.nbinsx > 0))
            for (var i=0;i<this.nbinsx;++i) {
               xmin = Math.max(xmin, this.GetBinX(i));
               if (xmin>0) break;
            }
         if (xmin <= 0) xmin = 1e-4*xmax;
         this.tx = d3.scale.log();
         this.x_kind = "log";
      } else {
         this.tx = d3.scale.linear();
         this.x_kind = "lin";
      }
      this.tx.domain([ xmin, xmax ]).range([ grminx, grmaxx ]);
      this.x_handle = new JSROOT.TAxisPainter(histo ? histo.fXaxis : null);
      this.x_handle.SetAxisConfig("xaxis", this.x_kind, this.tx, this.xmin, this.xmax, xmin, xmax);
      this.x_handle.CreateFormatFuncs();

      if (this.options.Logy) {
         if (ymax <= 0) ymax = 1.;
         if ((ymin <= 0) && (this.nbinsy>0))
            for (var i=0;i<this.nbinsy;++i) {
               ymin = Math.max(ymin, this.GetBinY(i));
               if (ymin>0) break;
            }

         if (ymin <= 0) ymin = 1e-4*ymax;
         this.ty = d3.scale.log();
         this.y_kind = "log";
      } else {
         this.ty = d3.scale.linear();
         this.y_kind = "lin";
      }
      this.ty.domain([ ymin, ymax ]).range([ grminy, grmaxy ]);
      this.y_handle = new JSROOT.TAxisPainter(histo ? histo.fYaxis : null);
      this.y_handle.SetAxisConfig("yaxis", this.y_kind, this.ty, this.ymin, this.ymax, ymin, ymax);
      this.y_handle.CreateFormatFuncs();

      if (this.options.Logz) {
         if (zmax <= 0) zmax = 1;
         if (zmin <= 0) zmin = 1e-4*zmax;
         this.tz = d3.scale.log();
         this.z_kind = "log";
      } else {
         this.tz = d3.scale.linear();
         this.z_kind = "lin";
      }
      this.tz.domain([ zmin, zmax ]).range([ grminz, grmaxz ]);

      this.z_handle = new JSROOT.TAxisPainter(histo ? histo.fZaxis : null);
      this.z_handle.SetAxisConfig("zaxis", this.z_kind, this.tz, this.zmin, this.zmax, zmin, zmax);
      this.z_handle.CreateFormatFuncs();

      var textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      var lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });

      var ticklen = textsize * 0.5, text, tick;

      var xticks = this.x_handle.CreateTicks();

      // geometry used for the tick drawing
      var geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      geometry.vertices.push(new THREE.Vector3(0, -1, -1));

      while (xticks.next()) {
         var grx = xticks.grpos;
         var is_major = (xticks.kind===1);
         var lbl = this.x_handle.format(xticks.tick, true, true);
         if (xticks.last_major()) lbl = "x"; else
            if (lbl === null) { is_major = false; lbl = ""; }
         var plen = (is_major ? ticklen : ticklen * 0.6) * Math.sin(Math.PI/4);

         if (is_major) {
            var text3d = new THREE.TextGeometry(lbl, { size : textsize, height : 0, curveSegments : 10 });
            text3d.computeBoundingBox();
            var centerOffset = 0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);

            if (bothsides) {
               text = new THREE.Mesh(text3d, textMaterial);
               text.position.set(grx + centerOffset, grmaxy + plen + textsize,  grminz - plen - textsize);
               text.rotation.x = Math.PI*3/4;
               text.rotation.y = Math.PI;
               text.name = "X axis";
               this.toplevel.add(text);
            }

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grx - centerOffset, grminy - plen - textsize, grminz - plen - textsize);
            text.rotation.x = Math.PI/4;
            text.name = "X axis";
            this.toplevel.add(text);
         }

         if (bothsides) {
            tick = new THREE.Line(geometry, lineMaterial);
            tick.position.set(grx,grmaxy, grminz);
            tick.scale.set(1,plen,plen);
            tick.rotation.z = Math.PI;
            tick.name = "X axis: " + this.x_handle.format(xticks.tick);
            this.toplevel.add(tick);
         }

         tick = new THREE.Line(geometry, lineMaterial);
         tick.position.set(grx,grminy,grminz);
         tick.scale.set(1,plen,plen);
         tick.name = "X axis: " + this.x_handle.format(xticks.tick);
         this.toplevel.add(tick);
      }

      var yticks = this.y_handle.CreateTicks();
      geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      geometry.vertices.push(new THREE.Vector3(-1, 0, -1));

      while (yticks.next()) {
         var gry = yticks.grpos;
         var is_major = (yticks.kind===1);
         var lbl = this.y_handle.format(yticks.tick, true, true);
         if (yticks.last_major()) lbl = "y"; else
            if (lbl === null) { is_major = false; lbl = ""; }
         var plen = (is_major ? ticklen : ticklen*0.6) * Math.sin(Math.PI/4);

         if (is_major) {
            var text3d = new THREE.TextGeometry(lbl, { size : textsize, height : 0, curveSegments : 10 });

            text3d.computeBoundingBox();
            var centerOffset = 0.5 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x);

            if (bothsides) {
               text = new THREE.Mesh(text3d, textMaterial);
               text.position.set(grmaxx + plen + textsize, gry + centerOffset, grminz - plen - textsize);
               text.rotation.y = Math.PI / 4;
               text.rotation.z = Math.PI / 2;
               text.name = "Y axis";
               this.toplevel.add(text);
            }

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grminx - plen - textsize, gry + centerOffset, grminz - plen - textsize);
            text.rotation.y = -Math.PI / 4;
            text.rotation.z = -Math.PI / 2;
            text.name = "Y axis";
            this.toplevel.add(text);
         }
         if (bothsides) {
            tick = new THREE.Line(geometry, lineMaterial);
            tick.position.set(grmaxx,gry,grminz);
            tick.scale.set(plen,1,plen);
            tick.rotation.z = Math.PI;
            tick.name = "Y axis " + this.y_handle.format(yticks.tick);
            this.toplevel.add(tick);
         }
         tick = new THREE.Line(geometry, lineMaterial);
         tick.position.set(grminx,gry,grminz);
         tick.scale.set(plen,1, plen);
         tick.name = "Y axis " + this.y_handle.format(yticks.tick);
         this.toplevel.add(tick);
      }

      var zticks = this.z_handle.CreateTicks();
      geometry = new THREE.Geometry();
      geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      geometry.vertices.push(new THREE.Vector3(-1, 1, 0));
      while (zticks.next()) {
         var grz = zticks.grpos;
         var is_major = zticks.kind == 1;

         var lbl = this.z_handle.format(zticks.tick, true, true);
         if (lbl === null) { is_major = false; lbl = ""; }
         var plen = (is_major ? ticklen : ticklen * 0.6) * Math.sin(Math.PI/4);

         if (is_major) {
            var text3d = new THREE.TextGeometry(lbl, { size : textsize, height : 0, curveSegments : 10 });

            text3d.computeBoundingBox();
            var offset = 0.8 * (text3d.boundingBox.max.x - text3d.boundingBox.min.x) + 0.7 * textsize;

            var textz = grz - 0.4*textsize;

            if (bothsides) {
               text = new THREE.Mesh(text3d, textMaterial);
               text.position.set(grmaxx + offset, grmaxy + offset, textz);
               text.rotation.x = 0.5*Math.PI;
               text.rotation.y = -0.75 * Math.PI;
               text.name = "Z axis";
               this.toplevel.add(text);

               text = new THREE.Mesh(text3d, textMaterial);
               text.position.set(grmaxx + offset, grminy - offset, textz);
               text.rotation.x = 0.5*Math.PI;
               text.rotation.y = 0.75*Math.PI;
               text.name = "Z axis";
               this.toplevel.add(text);

               text = new THREE.Mesh(text3d, textMaterial);
               text.position.set(grminx - offset, grminy - offset, textz);
               text.rotation.x = 0.5*Math.PI;
               text.rotation.y = 0.25*Math.PI;
               text.name = "Z axis";
               this.toplevel.add(text);
            }

            text = new THREE.Mesh(text3d, textMaterial);
            text.position.set(grminx - offset, grmaxy + offset, textz);
            text.rotation.x = 0.5*Math.PI;
            text.rotation.y = -0.25*Math.PI;
            text.name = "Z axis";
            this.toplevel.add(text);
         }
         if (bothsides) {
            tick = new THREE.Line(geometry, lineMaterial);
            tick.position.set(grmaxx,grmaxy,grz);
            tick.scale.set(plen,plen,1);
            tick.rotation.z = -Math.PI/2;
            tick.name = "Z axis " + this.z_handle.format(zticks.tick);
            this.toplevel.add(tick);

            tick = new THREE.Line(geometry, lineMaterial);
            tick.position.set(grmaxx,grminy,grz);
            tick.scale.set(plen,plen,1);
            tick.rotation.z = Math.PI;
            tick.name = "Z axis " + this.z_handle.format(zticks.tick);
            this.toplevel.add(tick);

            tick = new THREE.Line(geometry, lineMaterial);
            tick.position.set(grminx,grminy,grz);
            tick.scale.set(plen,plen,1);
            tick.rotation.z = Math.PI/2;
            tick.name = "Z axis " + this.z_handle.format(zticks.tick);
            this.toplevel.add(tick);
         }

         tick = new THREE.Line(geometry, lineMaterial);
         tick.position.set(grminx,grmaxy,grz);
         tick.scale.set(plen,plen,1);
         tick.name = "Z axis " + this.z_handle.format(zticks.tick);
         this.toplevel.add(tick);
      }

      // for TAxis3D do not show final cube
      if (this.size3d === 0) return;

      var wireMaterial = new THREE.MeshBasicMaterial({
         color : 0x000000,
         wireframe : true,
         wireframeLinewidth : 0.5,
         side : THREE.DoubleSide
      });


      // create a new mesh with cube geometry
      var cube = new THREE.Mesh(new THREE.BoxGeometry(this.size3d * 2, this.size3d * 2, this.size3d * 2), wireMaterial);
      //cube.position.y = size;

      var helper = new THREE.BoxHelper(cube);
      helper.material.color.set(0x000000);

      var box = new THREE.Object3D();
      box.add(helper);
      box.position.z = this.size3d;

      // add the cube to the scene
      this.toplevel.add(box);
   }

   JSROOT.Painter.TH2Painter_Draw3DBins = function() {

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[this.GetObject().fFillColor]);

      var local_bins = this.CreateDrawBins(100, 100);

      // create the bin cubes
      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255, fcolor.b / 255);

      var material = new THREE.MeshLambertMaterial({ color : fillcolor.getHex() });

      var geom = new THREE.BoxGeometry(1, 1, 1);

      var zmin = this.tz.domain()[0], zmax = this.tz.domain()[1];

      var z1 = this.tz(zmin);

      for (var i = 0; i < local_bins.length; ++i) {
         var hh = local_bins[i];
         if (hh.z <= zmin) continue;

         var x1 = this.tx(hh.x1), x2 = this.tx(hh.x2),
             y1 = this.ty(hh.y1), y2 = this.ty(hh.y2),
             z2 = (hh.z > zmax) ? this.tz(zmax) : this.tz(hh.z);

         if ((x1 < -1.001*this.size3d) || (x2 > 1.001*this.size3d) ||
             (y1 < -1.001*this.size3d) || (y2 > 1.001*this.size3d)) continue;

         // create a new mesh with cube geometry
         var bin = new THREE.Mesh(geom, material.clone());

         bin.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
         bin.scale.set(x2-x1,y2-y1,z2-z1);

         if ('tip' in hh) bin.name = hh.tip;
         this.toplevel.add(bin);

         var helper = new THREE.BoxHelper(bin);
         helper.material.color.set(0x000000);
         helper.material.linewidth = 1.0;
         this.toplevel.add(helper);
      }

      delete local_bins;
      local_bins = null;
   }

   JSROOT.Painter.Render3D = function(tmout) {
      if (tmout === undefined) tmout = 5; // by default, rendering happens with timeout

      if (tmout <= 0) {
         if ('render_tmout' in this)
            clearTimeout(this.render_tmout);

         if (this.renderer === undefined) return;

         var tm1 = new Date();

         // do rendering, most consuming time
         this.renderer.render(this.scene, this.camera);

         var tm2 = new Date();

         delete this.render_tmout;

         if (this.first_render_tm === 0) {
            this.first_render_tm = tm2.getTime() - tm1.getTime();
            console.log('First render tm = ' + this.first_render_tm);
            this['Add3DInteraction'] = JSROOT.Painter.add3DInteraction;
            this.Add3DInteraction();
         }

         return;
      }

      // no need to shoot rendering once again
      if ('render_tmout' in this) return;

      this.render_tmout = setTimeout(this.Render3D.bind(this,0), tmout);
   }


   JSROOT.Painter.Resize3D = function() {

      var size3d = this.size_for_3d(this.svg_pad().property('can3d'));

      this.apply_3d_size(size3d);

      if ((this.scene_width === size3d.width) && (this.scene_height === size3d.height)) return;

      if ((size3d.width<10) || (size3d.height<10)) return;

      this.scene_width = size3d.width;
      this.scene_height = size3d.height;

      this.camera.aspect = this.scene_width / this.scene_height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize( this.scene_width, this.scene_height );

      this.Render3D();
   }

   JSROOT.Painter.TH2Painter_Draw3D = function(call_back) {
      // function called with this as painter

      this.Create3DScene();

      this.zmin = this.options.Logz ? this.gmin0bin * 0.3 : this.gminbin;
      this.zmax = this.gmaxbin * 1.05; // not very nice

      this.DrawXYZ();

      this.Draw3DBins();

      this.DrawTitle();

      this.Render3D();

      JSROOT.CallBack(call_back);
   }

   // ==============================================================================


   JSROOT.TH3Painter = function(histo) {
      JSROOT.THistPainter.call(this, histo);

      this['Create3DScene'] = JSROOT.Painter.HPainter_Create3DScene;
   }

   JSROOT.TH3Painter.prototype = Object.create(JSROOT.THistPainter.prototype);

   JSROOT.TH3Painter.prototype.ScanContent = function() {
      var histo = this.GetObject();

      this.nbinsx = histo.fXaxis.fNbins;
      this.nbinsy = histo.fYaxis.fNbins;
      this.nbinsz = histo.fZaxis.fNbins;

      this.xmin = histo.fXaxis.fXmin;
      this.xmax = histo.fXaxis.fXmax;

      this.ymin = histo.fYaxis.fXmin;
      this.ymax = histo.fYaxis.fXmax;

      this.zmin = histo.fZaxis.fXmin;
      this.zmax = histo.fZaxis.fXmax;

      // global min/max, used at the moment in 3D drawing

      this.gminbin = this.gmaxbin = histo.getBinContent(1,1,1);
      var i,j,k;
      for (i = 0; i < this.nbinsx; ++i)
         for (j = 0; j < this.nbinsy; ++j)
            for (k = 0; k < this.nbinsz; ++k) {
               var bin_content = histo.getBinContent(i+1, j+1, k+1);
               if (bin_content < this.gminbin) this.gminbin = bin_content; else
               if (bin_content > this.gmaxbin) this.gmaxbin = bin_content;
            }

      this.draw_content = this.gmaxbin > 0;

      this.CreateAxisFuncs(true, true);
   }

   JSROOT.TH3Painter.prototype.CountStat = function() {
      var histo = this.GetObject(),
          stat_sum0 = 0, stat_sumx1 = 0, stat_sumy1 = 0,
          stat_sumz1 = 0, stat_sumx2 = 0, stat_sumy2 = 0, stat_sumz2 = 0,
          i1 = this.GetSelectIndex("x", "left"),
          i2 = this.GetSelectIndex("x", "right"),
          j1 = this.GetSelectIndex("y", "left"),
          j2 = this.GetSelectIndex("y", "right"),
          k1 = this.GetSelectIndex("z", "left"),
          k2 = this.GetSelectIndex("z", "right"),
          res = { entries: 0, integral: 0, meanx: 0, meany: 0, meanz: 0, rmsx: 0, rmsy: 0, rmsz: 0 };

      for (var xi = 0; xi < this.nbinsx+2; ++xi) {

         var xx = this.GetBinX(xi - 0.5);
         var xside = (xi < i1) ? 0 : (xi > i2 ? 2 : 1);

         for (var yi = 0; yi < this.nbinsy+2; ++yi) {

            var yy = this.GetBinY(yi - 0.5);
            var yside = (yi < j1) ? 0 : (yi > j2 ? 2 : 1);

            for (var zi = 0; zi < this.nbinsz+2; ++zi) {

               var zz = this.GetBinZ(zi - 0.5);
               var zside = (zi < k1) ? 0 : (zi > k2 ? 2 : 1);

               var cont = histo.getBinContent(xi, yi, zi);
               res.entries += cont;

               if ((xside==1) && (yside==1) && (zside==1)) {
                  stat_sum0 += cont;
                  stat_sumx1 += xx * cont;
                  stat_sumy1 += yy * cont;
                  stat_sumz1 += zz * cont;
                  stat_sumx2 += xx * xx * cont;
                  stat_sumy2 += yy * yy * cont;
                  stat_sumz2 += zz * zz * cont;
               }
            }
         }
      }

      if (histo.fTsumw > 0) {
         stat_sum0  = histo.fTsumw;
         stat_sumx1 = histo.fTsumwx;
         stat_sumx2 = histo.fTsumwx2;
         stat_sumy1 = histo.fTsumwy;
         stat_sumy2 = histo.fTsumwy2;
         stat_sumz1 = histo.fTsumwz;
         stat_sumz2 = histo.fTsumwz2;
      }

      if (stat_sum0 > 0) {
         res.meanx = stat_sumx1 / stat_sum0;
         res.meany = stat_sumy1 / stat_sum0;
         res.meanz = stat_sumz1 / stat_sum0;
         res.rmsx = Math.sqrt(stat_sumx2 / stat_sum0 - res.meanx * res.meanx);
         res.rmsy = Math.sqrt(stat_sumy2 / stat_sum0 - res.meany * res.meany);
         res.rmsz = Math.sqrt(stat_sumz2 / stat_sum0 - res.meanz * res.meanz);
      }

      res.integral = stat_sum0;

      if (histo.fEntries > 1) res.entries = histo.fEntries;

      return res;
   }

   JSROOT.TH3Painter.prototype.FillStatistic = function(stat, dostat, dofit) {
      if (this.GetObject()===null) return false;

      var pave = stat.GetObject(),
          data = this.CountStat(),
          print_name = dostat % 10,
          print_entries = Math.floor(dostat / 10) % 10,
          print_mean = Math.floor(dostat / 100) % 10,
          print_rms = Math.floor(dostat / 1000) % 10,
          print_under = Math.floor(dostat / 10000) % 10,
          print_over = Math.floor(dostat / 100000) % 10,
          print_integral = Math.floor(dostat / 1000000) % 10;
      //var print_skew = Math.floor(dostat / 10000000) % 10;
      //var print_kurt = Math.floor(dostat / 100000000) % 10;

      if (print_name > 0)
         pave.AddText(this.GetObject().fName);

      if (print_entries > 0)
         pave.AddText("Entries = " + stat.Format(data.entries,"entries"));

      if (print_mean > 0) {
         pave.AddText("Mean x = " + stat.Format(data.meanx));
         pave.AddText("Mean y = " + stat.Format(data.meany));
         pave.AddText("Mean z = " + stat.Format(data.meanz));
      }

      if (print_rms > 0) {
         pave.AddText("Std Dev x = " + stat.Format(data.rmsx));
         pave.AddText("Std Dev y = " + stat.Format(data.rmsy));
         pave.AddText("Std Dev z = " + stat.Format(data.rmsz));
      }

      if (print_integral > 0) {
         pave.AddText("Integral = " + stat.Format(data.integral,"entries"));
      }

      // adjust the size of the stats box with the number of lines

      var nlines = pave.fLines.arr.length,
          stath = nlines * JSROOT.gStyle.StatFontSize;
      if (stath <= 0 || 3 == (JSROOT.gStyle.StatFont % 10)) {
         stath = 0.25 * nlines * JSROOT.gStyle.StatH;
         pave.fY1NDC = 0.93 - stath;
         pave.fY2NDC = 0.93;
      }

      return true;
   }

   JSROOT.TH3Painter.prototype.Draw3DBins = function() {

      if (!this.draw_content) return;

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[this.GetObject().fFillColor]);

      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255,  fcolor.b / 255);

      var material = null, geom = null; intersect_geom = null;

      if (this.options.Box == 11) {
         material = new THREE.MeshPhongMaterial({ color : fillcolor.getHex(), specular : 0x4f4f4f });
         //geom = new THREE.SphereGeometry(this.size3d / this.nbinsx);
         geom = new THREE.SphereGeometry(0.5, 18, 16);
         intersect_geom = new THREE.SphereGeometry(0.6, 12, 10);
         geom.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
         //geom.scale(1, this.nbinsx / this.nbinsy, this.nbinsx / this.nbinsz);
      } else {
         material = new THREE.MeshLambertMaterial({ color : fillcolor.getHex() });
         // geom = new THREE.BoxGeometry(2 * this.size3d / this.nbinsx, 2 * this.size3d / this.nbinsy, 2 * this.size3d / this.nbinsz);
         geom = new THREE.BoxGeometry(1, 1, 1);
      }

      var histo = this.GetObject(),
          i1 = this.GetSelectIndex("x", "left", 0),
          i2 = this.GetSelectIndex("x", "right", 0),
          j1 = this.GetSelectIndex("y", "left", 0),
          j2 = this.GetSelectIndex("y", "right", 0),
          k1 = this.GetSelectIndex("z", "left", 0),
          k2 = this.GetSelectIndex("z", "right", 0),
          name = this.GetTipName("<br/>");

      var scalex = (this.tx(this.GetBinX(i2+0.5)) - this.tx(this.GetBinX(i1+0.5))) / (i2-i1),
          scaley = (this.ty(this.GetBinY(j2+0.5)) - this.ty(this.GetBinY(j1+0.5))) / (j2-j1),
          scalez = (this.tz(this.GetBinZ(k2+0.5)) - this.tz(this.GetBinZ(k1+0.5))) / (k2-k1);

      // Single Object3Ds that contain all bins and helpers
      var all_bins = new THREE.Object3D();
      var all_helpers = new THREE.Object3D();

      var box_vcount = geom.faces.length*3;
      // BufferGeometries that store geometry of all bins
      var all_bins_buffgeom = new THREE.BufferGeometry();
      var all_bins_linebuff = new THREE.BufferGeometry();  
   
      var single_bin_verts = new Float32Array(box_vcount*3);
      var single_bin_norms = new Float32Array(box_vcount*3);
      var temp_bin_verts = [];
      // Fill a typed array with cube geometry that will be shared by all
      // (This technically could be put into an InstancedBufferGeometry but 
      // performance gain is likely not huge )
      for (var face = 0; face < geom.faces.length; ++face) {
         single_bin_verts[9*face  ] = geom.vertices[geom.faces[face].a].x;
         single_bin_verts[9*face+1] = geom.vertices[geom.faces[face].a].y;
         single_bin_verts[9*face+2] = geom.vertices[geom.faces[face].a].z;  
         single_bin_verts[9*face+3] = geom.vertices[geom.faces[face].b].x;
         single_bin_verts[9*face+4] = geom.vertices[geom.faces[face].b].y;
         single_bin_verts[9*face+5] = geom.vertices[geom.faces[face].b].z;
         single_bin_verts[9*face+6] = geom.vertices[geom.faces[face].c].x;
         single_bin_verts[9*face+7] = geom.vertices[geom.faces[face].c].y;
         single_bin_verts[9*face+8] = geom.vertices[geom.faces[face].c].z;

         single_bin_norms[9*face  ] = geom.faces[face].vertexNormals[0].x;
         single_bin_norms[9*face+1] = geom.faces[face].vertexNormals[0].y;
         single_bin_norms[9*face+2] = geom.faces[face].vertexNormals[0].z;
         single_bin_norms[9*face+3] = geom.faces[face].vertexNormals[1].x;
         single_bin_norms[9*face+4] = geom.faces[face].vertexNormals[1].y;
         single_bin_norms[9*face+5] = geom.faces[face].vertexNormals[1].z;
         single_bin_norms[9*face+6] = geom.faces[face].vertexNormals[2].x;
         single_bin_norms[9*face+7] = geom.faces[face].vertexNormals[2].y;
         single_bin_norms[9*face+8] = geom.faces[face].vertexNormals[2].z;  
      }

      for (var i = i1; i < i2; ++i) {
         var binx = this.GetBinX(i+0.5), grx = this.tx(binx);
         for (var j = j1; j < j2; ++j) {
            var biny = this.GetBinY(j+0.5), gry = this.ty(biny);
            for (var k = k1; k < k2; ++k) {
               var bin_content = histo.getBinContent(i+1, j+1, k+1);
               if (bin_content <= this.gminbin) continue;

               var wei = (this.options.Color > 0) ? 1. : bin_content / this.gmaxbin;

               if (wei < 1e-5) continue; // do not show empty bins

               var binz = this.GetBinZ(k+0.5), grz = this.tz(binz);

               if (this.options.Box !== 11) {
                  var bin = new THREE.Mesh(geom, material.clone());
               } else {
                  var bin = new THREE.Mesh(intersect_geom, material.clone());
               }

               bin.position.set( grx, gry, grz );

               bin.scale.set(scalex*wei, scaley*wei, scalez*wei);
               
               // Grab the coordinates and scale that are being assigned to each bin
               for (var vi = 0; vi < box_vcount; ++vi) {
                  temp_bin_verts.push(single_bin_verts[3*vi  ]*scalex*wei+grx);
                  temp_bin_verts.push(single_bin_verts[3*vi+1]*scaley*wei+gry);
                  temp_bin_verts.push(single_bin_verts[3*vi+2]*scalez*wei+grz);
               }
            
               // Make old bins invisible so they don't hurt performance but
               // still cause tooltip to show up
               bin.material.visible = false;

               if (JSROOT.gStyle.Tooltip > 0)
                  bin.name = name + 'x=' + JSROOT.FFormat(binx,"6.4g") + ' bin=' + (i+1) + '<br/>'
                                  + 'y=' + JSROOT.FFormat(biny,"6.4g") + ' bin=' + (j+1) + '<br/>'
                                  + 'z=' + JSROOT.FFormat(binz,"6.4g") + ' bin=' + (k+1) + '<br/>'
                                  + 'entries=' + JSROOT.FFormat(bin_content, "7.0g");

               all_bins.add(bin);

               if (this.options.Box !== 11) {
                  var helper = new THREE.BoxHelper(bin);
                  helper.material.color.set(0x000000);
                  helper.material.linewidth = 1.0;
                  helper.material.visible = false;
                  all_helpers.add(helper)
               }
            }
         }
      }

      // Fill full size typed arrays with vertex and normal data
      bin_verts = new Float32Array(temp_bin_verts.length);
      bin_norms = new Float32Array(temp_bin_verts.length);
      for (var i = 0; i<temp_bin_verts.length; ++i) {
         bin_verts[i] = temp_bin_verts[i];  
         bin_norms[i] = single_bin_norms[i%single_bin_norms.length];
      }

      // Create mesh from bin buffergeometry
      all_bins_buffgeom.addAttribute( 'position', 
         new THREE.BufferAttribute( bin_verts, 3 ) );
      all_bins_buffgeom.addAttribute( 'normal', 
         new THREE.BufferAttribute( bin_norms, 3 ) );
      var combined_bins = new THREE.Mesh(all_bins_buffgeom, material.clone());
      this.toplevel.add(combined_bins);

      // Extract geometry from helper cubes to create efficient single mesh
      if (this.options.Box !== 11) {
         var line_verts = [];
         var line_indices = [];
         // Vertex and Index data
         for (var i = 0; i < all_helpers.children.length; ++i) {
            var current_v = all_helpers.children[i].geometry.getAttribute('position').array;
            for (var v = 0; v < current_v.length; ++v) {
               line_verts.push(current_v[v]);
            }
            var current_i = all_helpers.children[i].geometry.index.array;
            for (var ci = 0; ci < current_i.length; ++ci) {
               line_indices.push(current_i[ci]+i*8);
            }
         }

         all_bins_linebuff.setIndex(
          new THREE.BufferAttribute( new Uint16Array(line_indices), 1 ) ); 
         all_bins_linebuff.addAttribute( 'position', 
              new THREE.BufferAttribute( new Float32Array(line_verts), 3 ) );
         
         var combined_lines = new THREE.LineSegments(
              all_bins_linebuff, all_helpers.children[0].material.clone());

         combined_lines.material.visible = true;
         this.toplevel.add(combined_lines);
      }

      this.toplevel.add(all_bins);
      this.toplevel.add(all_helpers);
   }

   JSROOT.TH3Painter.prototype.Redraw = function(resize) {
      if (resize) {
         this.Resize3D();
      } else {
         this.Create3DScene();
         this.DrawXYZ();
         this.Draw3DBins();
         this.Render3D();
      }
   }

   JSROOT.TH3Painter.prototype.CheckResize = function(size) {
      var pad_painter = this.pad_painter();

      var changed = true;

      // firefox is the only browser which correctly supports resize of embedded canvas,
      // for others we should force canvas redrawing at every step
      if (pad_painter)
         changed = pad_painter.CheckCanvasResize(size, JSROOT.browser.isFirefox ? false : true);

      if (changed) this.Resize3D(size);
   }

   JSROOT.TH3Painter.prototype.FillToolbar = function() {
      var pp = this.pad_painter(true);
      if (pp===null) return;

      pp.AddButton(JSROOT.ToolbarIcons.undo, 'Unzoom all axes', 'UnzoomAllAxis');
      if (this.draw_content)
         pp.AddButton(JSROOT.ToolbarIcons.statbox, 'Toggle stat box', "ToggleStatBox");
   }

   JSROOT.TH3Painter.prototype.FillHistContextMenu = function(menu) {
      if (!this.draw_content) return;

      menu.addDrawMenu("Draw with", ["box", "box1"], function(arg) {
         this.options = this.DecodeOptions(arg);
         this.Redraw();
      });
   }


   JSROOT.Painter.drawHistogram3D = function(divid, histo, opt) {
      // when called, *this* set to painter instance

      // create painter and add it to canvas
      JSROOT.extend(this, new JSROOT.TH3Painter(histo));

      this.SetDivId(divid, 4);

      this.options = this.DecodeOptions(opt);

      this.CheckPadOptions();

      this.ScanContent();

      this.Redraw();

      this.DrawTitle();

      if (JSROOT.gStyle.AutoStat && this.create_canvas) {
         var stats = this.CreateStat();
         if (stats) JSROOT.draw(this.divid, stats, "");
      }

      this.FillToolbar();

      return this.DrawingReady();
   }

   // ===================================================================

   JSROOT.Painter.drawPolyMarker3D = function(divid, poly, opt) {
      // when called, *this* set to painter instance

      this.SetDivId(divid);

      var main = this.main_painter();

      if ((main == null) || !('renderer' in main)) return this.DrawingReady();

      var cnt = poly.fP.length;
      var step = 3;

      if ((JSROOT.gStyle.OptimizeDraw > 0) && (cnt > 1000*3)) {
         step = Math.floor(cnt / 1000 / 3) * 3;
         if (step <= 6) step = 6;
      }

      var fcolor = d3.rgb(JSROOT.Painter.root_colors[poly.fMarkerColor]);
      var fillcolor = new THREE.Color(0xDDDDDD);
      fillcolor.setRGB(fcolor.r / 255, fcolor.g / 255,  fcolor.b / 255);

      var material = new THREE.MeshPhongMaterial({ color : fillcolor.getHex(), specular : 0x4f4f4f});

      // var geom = new THREE.SphereBufferGeometry(1);
      var geom = new THREE.BoxGeometry(1, 1, 1);

      for (var n=0; n<cnt; n+=step) {
         var bin = new THREE.Mesh(geom, material.clone());
         bin.position.set( main.tx(poly.fP[n]), main.ty(poly.fP[n+1]), main.tz(poly.fP[n+2]) );
         bin.name = (poly.fName !== "TPolyMarker3D") ? (poly.fName + ": ") : ("bin " + n/3 + ": ");
         bin.name += main.x_handle.format(poly.fP[n]) + "," + main.y_handle.format(poly.fP[n+1]) + "," + main.z_handle.format(poly.fP[n+2]);
         main.toplevel.add(bin);
      }

      main.Render3D();

      return this.DrawingReady();
   }

   return JSROOT.Painter;

}));

