​import {Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import {StudentService} from '../services/student.service';
import {Student} from '../Structs/studentClass';
import {ActivatedRoute} from '@angular/router';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef, MatDatepickerModule, MatCheckboxModule} from '@angular/material';
import { Tweet } from '../Structs/tweetClass';
import { TweetsService } from '../services/tweets.service';
import { SectionService } from '../services/section.service';
import { Section } from '../Structs/sectionClass';

@Component({
  selector: 'app-student-view',
  templateUrl: './student-view.component.html',
  styleUrls: ['./student-view.component.css']
})​​


export class StudentViewComponent implements OnInit {

  ands = {
    labels: ['2013-02-08T09', '2013-02-09T09', '2013-02-10T09', '2013-02-11T09', '2013-02-12T09', '2013-02-13T09', '2013-02-14T09'],
    datasets: [{
      label: 'Num of Tweets',
      data: [3, 3, 4, 3, 3, 4, 3],
    }]
  };

  student: Student;
  section: Section;
  roster: Student[];

  public barChartOptions:any = {
    scaleShowVerticalLines: false,
    responsive: true,
    scales : {
      yAxes: [{
        ticks: {
          steps : 10,
          stepValue : 10,
          max : 50,
        }
      }]
    }
  };
  public barChartLabels:string[] = ['Tweets', 'Retweets', 'Likes'];
  public barChartType:string = 'bar';
  public barChartLegend:boolean = false;
  public tweets:Tweet[] = [];
  tweetsChecked: boolean;
  retweetsChecked: boolean;
  repliesChecked: boolean;
  topicsChecked: boolean[];

  inputStartDate: Date;
  inputEndDate: Date;


  public barChartData:any[] = [
    {data: [0]}
  ];


  public doughnutChartLabels:string[];
  public doughnutChartData:number[] = [0,0,0];
  public doughnutChartType:string = 'doughnut';
  doughnutChartOptions:any;

  constructor(private studentService : StudentService,
              private tweetService : TweetsService,
              private sectionService : SectionService,
              private route: ActivatedRoute,
              private matDialog: MatDialog) {}

  ngOnInit() {
    this.getStudent();
  }

  // events
  public chartClicked(e:any):void {
    console.log(e);
  }

  public chartHovered(e:any):void {
    console.log(e);
  }

  getStudent() : void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log("Student view")
    console.log(id);
    this.studentService.getStudent(id)
      .subscribe(student => {
        this.student = student;
        this.barChartData = [{data: [student.totTweets, student.totRetweets, student.totLikes]}];
        this.doughnutChartData = this.student.topicDistNum;
        this.tweetService.getTweets(this.student.handle, new Date(2018, 10, 8), new Date(), [], true, true)
            .subscribe(tweets => {
              this.tweets = tweets;
              console.log('tweets received');
              console.log(this.tweets);
            });
        this.sectionService.getSection(student.courseNum).subscribe(section => {
          this.section = section;
          this.doughnutChartLabels = this.section.topics as string[];
          for(let label of this.doughnutChartLabels) {
            this[label] = true;
            // this.topicsChecked.push(this[label])
          }
          console.log(this.doughnutChartLabels)
          console.log(this.section)
        });
        this.studentService.getStudents(student.courseNum).subscribe(roster => {
          this.roster = roster;
          console.log(this.roster)
        })
        
        
        this.tweetsChecked = true;
        this.retweetsChecked = true;
        this.repliesChecked = true;
        console.log('Student recieved');
        console.log(student);
      });
    console.log("_____________")
    
  }

  exportData() : void {
    window.print();
    let dialogRef = this.matDialog.open(ExportDialogComponent, {
      width: '250px'
    });
  }

  updateFilters() : void {
    let sDate = new Date(0);
    let eDate = new Date();
    if (this.inputStartDate != null) {
      sDate = this.inputStartDate;
    }
    if (this.inputEndDate != null) {
      eDate = this.inputEndDate;
    }
    
    let topics = []
    console.log(this.doughnutChartLabels)
    for(let label in this.doughnutChartLabels){
      let name = this.doughnutChartLabels[label]
      if (this[name] == true){
        topics.push(name)
      }
    }
    console.log("start Date: " + sDate + " end date: " + eDate + " labels: " + topics + " replies: " + this.repliesChecked + " retweets: " + this.retweetsChecked)
    this.tweetService.getTweets(this.student.handle, sDate, eDate, topics, this.repliesChecked, this.retweetsChecked)
            .subscribe(tweets => {
              this.tweets = tweets;
              console.log('tweets received');
              console.log(this.tweets);
            });
  }
}

@Component({
  selector: 'app-export-dialog',
  templateUrl: './export-dialog.component.html',
})

export class ExportDialogComponent {


  constructor(public dialogRef: MatDialogRef<ExportDialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: any) { }


  onClose() : void {
    this.dialogRef.close();
  }
}

​