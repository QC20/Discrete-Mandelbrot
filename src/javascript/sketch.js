function setup() {
	 
	createCanvas (600,600);
}

function draw() {

	//visit every pixel
	for (var x = 0; x <600; x += 2){
		for (var y = 0; y <600; y += 2){
			
			// convert x,y to c = a + bi
			var a = map(x, 0, 600, -1.75, 1.75);
			var b = map(y, 0, 600, -1.75, 1.75);
			
			//start with z = 0 + 0i
			var z_real = 0
			var z_imag = 0
			
			//maximum iterations
			var max_iter = 64;
			
			for (var iteration = 1; (iteration <= max_iter) && (dist(0,0, z_real, z_imag) < 2); iteration += 1) {
				// apply z*z + c
				var z_real_temp = (z_real * z_real * z_real * z_real) - (6 * z_real * z_real * z_imag * z_imag) + (z_imag * z_imag * z_imag * z_imag) + a;
				z_imag = (4 * z_real * z_real * z_real * z_imag) - (4 * z_real * z_imag * z_imag * z_imag) + b;
				z_real = z_real_temp;
			}
			
			if (iteration == max_iter+1) {
				stroke (0,0,0);
				point (x,y);
			}
		
		}
	}
	
}